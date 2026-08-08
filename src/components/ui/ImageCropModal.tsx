import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, LayoutChangeEvent, Modal, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useAppTheme } from '@/theme';
import { IconButton } from './Button';

const INITIAL_STAGE_WIDTH = Dimensions.get('window').width;
const INITIAL_STAGE_HEIGHT = Dimensions.get('window').height * 0.55;
const MAX_ZOOM_MULTIPLIER = 5;

const ASPECT_PRESETS: Array<{ key: string; label: string; value: [number, number] }> = [
  { key: '1:1', label: '1:1', value: [1, 1] },
  { key: '4:3', label: '4:3', value: [4, 3] },
  { key: '3:4', label: '3:4', value: [3, 4] },
  { key: '16:9', label: '16:9', value: [16, 9] },
  { key: '9:16', label: '9:16', value: [9, 16] },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const clampWorklet = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};

function fitFrame(aspect: [number, number], stageWidth: number, stageHeight: number) {
  const maxWidth = stageWidth * 0.9;
  const maxHeight = stageHeight * 0.9;
  const ratio = aspect[1] / aspect[0];
  let width = maxWidth;
  let height = width * ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height / ratio;
  }
  return { width, height };
}

function aspectKeyFromValue(aspect: [number, number] | null) {
  if (!aspect) return '4:3';
  return ASPECT_PRESETS.find((p) => p.value[0] === aspect[0] && p.value[1] === aspect[1])?.key ?? '4:3';
}

interface ImageCropModalProps {
  visible: boolean;
  imageUri: string | null;
  imageWidth: number;
  imageHeight: number;
  /** Aspect ratio as [width, height], e.g. [4, 3]. Defaults to 4:3 if not one of the presets. */
  aspect: [number, number] | null;
  onCancel: () => void;
  onCropComplete: (uri: string) => void;
}

/**
 * Simple, fixed-frame image cropper: the crop frame stays centered and only its aspect ratio
 * changes; the photo itself is panned/pinch-zoomed behind it (like Instagram's cropper).
 */
export function ImageCropModal({
  visible,
  imageUri,
  imageWidth,
  imageHeight,
  aspect,
  onCancel,
  onCropComplete,
}: ImageCropModalProps) {
  const theme = useAppTheme();
  const [processing, setProcessing] = useState(false);
  const [selectedAspectKey, setSelectedAspectKey] = useState(() => aspectKeyFromValue(aspect));
  const activeAspect = ASPECT_PRESETS.find((p) => p.key === selectedAspectKey)?.value ?? [4, 3];

  const stageW = useSharedValue(INITIAL_STAGE_WIDTH);
  const stageH = useSharedValue(INITIAL_STAGE_HEIGHT);
  const [stageSize, setStageSize] = useState({ width: INITIAL_STAGE_WIDTH, height: INITIAL_STAGE_HEIGHT });

  const handleStageLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    stageW.value = width;
    stageH.value = height;
    setStageSize({ width, height });
  };

  const frameW = useSharedValue(0);
  const frameH = useSharedValue(0);

  // Photo transform - scale/translate are relative to the photo's own centered, unscaled position.
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const minScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const pinchFocalX = useSharedValue(0);
  const pinchFocalY = useSharedValue(0);
  const lastPinchScale = useSharedValue(1);

  // Recompute frame + reset the photo to a centered "cover" fit whenever the aspect or photo changes.
  useEffect(() => {
    if (!visible || !imageWidth || !imageHeight) return;
    const fitted = fitFrame(activeAspect, stageSize.width, stageSize.height);
    const nextMinScale = Math.max(fitted.width / imageWidth, fitted.height / imageHeight);

    frameW.value = withTiming(fitted.width);
    frameH.value = withTiming(fitted.height);
    minScale.value = nextMinScale;
    scale.value = withTiming(nextMinScale);
    savedScale.value = nextMinScale;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, imageUri, selectedAspectKey, imageWidth, imageHeight, stageSize.width, stageSize.height]);

  const clampTranslate = (nextScale: number, x: number, y: number) => {
    'worklet';
    const scaledWidth = imageWidth * nextScale;
    const scaledHeight = imageHeight * nextScale;
    const maxX = Math.max(0, (scaledWidth - frameW.value) / 2);
    const maxY = Math.max(0, (scaledHeight - frameH.value) / 2);
    return { x: clampWorklet(x, -maxX, maxX), y: clampWorklet(y, -maxY, maxY) };
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      const next = clampTranslate(scale.value, savedTranslateX.value + e.translationX, savedTranslateY.value + e.translationY);
      translateX.value = next.x;
      translateY.value = next.y;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onStart((e) => {
      lastPinchScale.value = 1;
      pinchFocalX.value = e.focalX - stageW.value / 2;
      pinchFocalY.value = e.focalY - stageH.value / 2;
    })
    .onUpdate((e) => {
      const delta = e.scale / lastPinchScale.value;
      lastPinchScale.value = e.scale;
      const nextScale = clampWorklet(scale.value * delta, minScale.value, minScale.value * MAX_ZOOM_MULTIPLIER);
      const factor = nextScale / scale.value;
      // Zoom towards the pinch focal point rather than the frame center.
      const nextX = pinchFocalX.value - (pinchFocalX.value - translateX.value) * factor;
      const nextY = pinchFocalY.value - (pinchFocalY.value - translateY.value) * factor;
      scale.value = nextScale;
      const next = clampTranslate(nextScale, nextX, nextY);
      translateX.value = next.x;
      translateY.value = next.y;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const target = scale.value > minScale.value * 1.5 ? minScale.value : minScale.value * 2.2;
      const next = clampTranslate(target, translateX.value, translateY.value);
      scale.value = withTiming(target);
      translateX.value = withTiming(next.x);
      translateY.value = withTiming(next.y);
      savedScale.value = target;
      savedTranslateX.value = next.x;
      savedTranslateY.value = next.y;
    });

  const composedGesture = Gesture.Simultaneous(doubleTapGesture, panGesture, pinchGesture);

  const photoStyle = useAnimatedStyle(() => ({
    width: imageWidth,
    height: imageHeight,
    left: (stageW.value - imageWidth) / 2,
    top: (stageH.value - imageHeight) / 2,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  const frameStyle = useAnimatedStyle(() => ({
    width: frameW.value,
    height: frameH.value,
    left: (stageW.value - frameW.value) / 2,
    top: (stageH.value - frameH.value) / 2,
  }));

  const handleConfirm = async () => {
    if (!imageUri) return;
    setProcessing(true);
    try {
      const cropWidth = frameW.value / scale.value;
      const cropHeight = frameH.value / scale.value;
      const cropOriginX = clamp(imageWidth / 2 - cropWidth / 2 - translateX.value / scale.value, 0, Math.max(0, imageWidth - cropWidth));
      const cropOriginY = clamp(imageHeight / 2 - cropHeight / 2 - translateY.value / scale.value, 0, Math.max(0, imageHeight - cropHeight));

      const context = ImageManipulator.manipulate(imageUri);
      context.crop({
        originX: cropOriginX,
        originY: cropOriginY,
        width: Math.min(cropWidth, imageWidth - cropOriginX),
        height: Math.min(cropHeight, imageHeight - cropOriginY),
      });
      const rendered = await context.renderAsync();
      const result = await rendered.saveAsync({ compress: 0.95, format: SaveFormat.JPEG });
      onCropComplete(result.uri);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: '#000' }]}>
          <View style={styles.header}>
            <IconButton icon="close" color="#fff" onPress={onCancel} />
            <Text style={styles.headerTitle}>Adjust Photo</Text>
            <IconButton icon="checkmark" color={theme.colors.primary} onPress={handleConfirm} disabled={processing} />
          </View>

          <View style={styles.stage} onLayout={handleStageLayout}>
            {imageUri ? (
              <>
                <GestureDetector gesture={composedGesture}>
                  <View style={StyleSheet.absoluteFill}>
                    <Animated.Image source={{ uri: imageUri }} style={[styles.photo, photoStyle]} resizeMode="cover" />
                  </View>
                </GestureDetector>

                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  <Animated.View style={[styles.frameMask, frameStyle]}>
                    <View style={[styles.gridLineV, { left: '33.333%' }]} />
                    <View style={[styles.gridLineV, { left: '66.666%' }]} />
                    <View style={[styles.gridLineH, { top: '33.333%' }]} />
                    <View style={[styles.gridLineH, { top: '66.666%' }]} />
                    <View style={[styles.frameBorder, { borderColor: '#fff' }]} />
                  </Animated.View>
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.aspectRow}>
            {ASPECT_PRESETS.map((preset) => {
              const active = preset.key === selectedAspectKey;
              return (
                <Text
                  key={preset.key}
                  onPress={() => setSelectedAspectKey(preset.key)}
                  style={[
                    styles.aspectPill,
                    {
                      color: active ? '#000' : '#fff',
                      backgroundColor: active ? '#fff' : 'rgba(255,255,255,0.15)',
                    },
                  ]}>
                  {preset.label}
                </Text>
              );
            })}
          </View>

          <Text style={styles.hint}>Pinch to zoom · drag to reposition · double-tap to toggle zoom</Text>

          {processing ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  stage: {
    flex: 1,
    overflow: 'hidden',
  },
  photo: {
    position: 'absolute',
  },
  frameMask: {
    position: 'absolute',
  },
  frameBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth * 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  aspectRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  aspectPill: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    overflow: 'hidden',
  },
  hint: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 24,
    fontSize: 12.5,
    opacity: 0.8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
