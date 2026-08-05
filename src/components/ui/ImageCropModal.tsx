import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/theme';
import { IconButton } from './Button';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const STAGE_WIDTH = SCREEN_WIDTH;
const STAGE_HEIGHT = SCREEN_HEIGHT;
const MIN_FRAME_SIZE = 90;
const HANDLE_HIT_SIZE = 32;
const MAX_ZOOM = 8;

const ASPECT_PRESETS: Array<{ key: string; label: string; value: [number, number] | null }> = [
  { key: 'free', label: 'Free', value: null },
  { key: '1:1', label: '1:1', value: [1, 1] },
  { key: '4:3', label: '4:3', value: [4, 3] },
  { key: '3:4', label: '3:4', value: [3, 4] },
  { key: '16:9', label: '16:9', value: [16, 9] },
  { key: '9:16', label: '9:16', value: [9, 16] },
];

const clampValue = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};

const fitFrameToStage = (aspect: [number, number] | null, maxWidth: number, maxHeight: number) => {
  if (aspect) {
    const ratio = aspect[1] / aspect[0];
    let width = maxWidth;
    let height = width * ratio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height / ratio;
    }
    return {
      width: Math.max(MIN_FRAME_SIZE, width),
      height: Math.max(MIN_FRAME_SIZE, height),
    };
  }

  const base = Math.min(maxWidth, maxHeight) * 0.78;
  return {
    width: Math.max(MIN_FRAME_SIZE, base),
    height: Math.max(MIN_FRAME_SIZE, base),
  };
};

const aspectKeyFromValue = (aspect: [number, number] | null) => {
  if (!aspect) return 'free';
  return ASPECT_PRESETS.find((item) => item.value?.[0] === aspect[0] && item.value?.[1] === aspect[1])?.key ?? 'free';
};

interface ImageCropModalProps {
  visible: boolean;
  imageUri: string | null;
  imageWidth: number;
  imageHeight: number;
  /** Aspect ratio as [width, height], e.g. [4, 3]. Pass null to use the image's own ratio and allow free resizing. */
  aspect: [number, number] | null;
  onCancel: () => void;
  onCropComplete: (uri: string) => void;
}

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

  const activeAspect = ASPECT_PRESETS.find((item) => item.key === selectedAspectKey)?.value ?? null;

  const initialFrame = fitFrameToStage(activeAspect ?? aspect, STAGE_WIDTH * 0.86, STAGE_HEIGHT * 0.62);

  const minZoom = Math.max(STAGE_WIDTH / imageWidth, STAGE_HEIGHT / imageHeight);
  const zoom = useSharedValue(minZoom);
  const savedZoom = useSharedValue(minZoom);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchOriginX = useSharedValue(0);
  const pinchOriginY = useSharedValue(0);
  const lastPinchScale = useSharedValue(1);

  const frameW = useSharedValue(initialFrame.width);
  const frameH = useSharedValue(initialFrame.height);
  const frameX = useSharedValue((STAGE_WIDTH - initialFrame.width) / 2);
  const frameY = useSharedValue((STAGE_HEIGHT - initialFrame.height) / 2);

  const startFrameX = useSharedValue((STAGE_WIDTH - initialFrame.width) / 2);
  const startFrameY = useSharedValue((STAGE_HEIGHT - initialFrame.height) / 2);
  const startFrameW = useSharedValue(initialFrame.width);
  const startFrameH = useSharedValue(initialFrame.height);

  useEffect(() => {
    if (visible) {
      const key = aspectKeyFromValue(aspect);
      setSelectedAspectKey(key);
      const resetAspect = ASPECT_PRESETS.find((item) => item.key === key)?.value ?? null;
      const resetFrame = fitFrameToStage(resetAspect, STAGE_WIDTH * 0.86, STAGE_HEIGHT * 0.62);

      zoom.value = minZoom;
      savedZoom.value = minZoom;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;

      frameW.value = resetFrame.width;
      frameH.value = resetFrame.height;
      frameX.value = (STAGE_WIDTH - resetFrame.width) / 2;
      frameY.value = (STAGE_HEIGHT - resetFrame.height) / 2;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, imageUri, aspect, minZoom]);

  useEffect(() => {
    if (!visible) return;

    const selectedAspect = ASPECT_PRESETS.find((item) => item.key === selectedAspectKey)?.value ?? null;
    const centerX = frameX.value + frameW.value / 2;
    const centerY = frameY.value + frameH.value / 2;
    const fitted = fitFrameToStage(selectedAspect, STAGE_WIDTH * 0.86, STAGE_HEIGHT * 0.62);
    const targetW = fitted.width;
    const targetH = fitted.height;
    const targetX = clampValue(centerX - targetW / 2, 0, STAGE_WIDTH - targetW);
    const targetY = clampValue(centerY - targetH / 2, 0, STAGE_HEIGHT - targetH);

    frameW.value = withTiming(targetW);
    frameH.value = withTiming(targetH);
    frameX.value = withTiming(targetX);
    frameY.value = withTiming(targetY);
  }, [selectedAspectKey, visible, frameH, frameW, frameX, frameY]);

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const clampTranslation = (
    nextZoom: number,
    x: number,
    y: number,
    nextFrameX: number,
    nextFrameY: number,
    nextFrameW: number,
    nextFrameH: number,
  ) => {
    'worklet';

    const scaledWidth = imageWidth * nextZoom;
    const scaledHeight = imageHeight * nextZoom;
    const stageCenterX = STAGE_WIDTH / 2;
    const stageCenterY = STAGE_HEIGHT / 2;

    const minX = nextFrameX + nextFrameW - stageCenterX - scaledWidth / 2;
    const maxX = nextFrameX - stageCenterX + scaledWidth / 2;
    const minY = nextFrameY + nextFrameH - stageCenterY - scaledHeight / 2;
    const maxY = nextFrameY - stageCenterY + scaledHeight / 2;

    return {
      x: clampValue(x, minX, maxX),
      y: clampValue(y, minY, maxY),
    };
  };

  const snapshotFrame = () => {
    'worklet';
    startFrameX.value = frameX.value;
    startFrameY.value = frameY.value;
    startFrameW.value = frameW.value;
    startFrameH.value = frameH.value;
  };

  const applyFrame = (x: number, y: number, w: number, h: number) => {
    'worklet';
    const nextW = clampValue(w, MIN_FRAME_SIZE, STAGE_WIDTH);
    const nextH = clampValue(h, MIN_FRAME_SIZE, STAGE_HEIGHT);
    const nextX = clampValue(x, 0, STAGE_WIDTH - nextW);
    const nextY = clampValue(y, 0, STAGE_HEIGHT - nextH);

    frameX.value = nextX;
    frameY.value = nextY;
    frameW.value = nextW;
    frameH.value = nextH;

    const nextTranslate = clampTranslation(zoom.value, translateX.value, translateY.value, nextX, nextY, nextW, nextH);
    translateX.value = nextTranslate.x;
    translateY.value = nextTranslate.y;
  };

  const makeCornerGesture = (corner: 'tl' | 'tr' | 'bl' | 'br') =>
    Gesture.Pan()
      .onStart(() => {
        snapshotFrame();
      })
      .onUpdate((e) => {
        const sx = startFrameX.value;
        const sy = startFrameY.value;
        const sw = startFrameW.value;
        const sh = startFrameH.value;

        let x = sx;
        let y = sy;
        let w = sw;
        let h = sh;

        if (corner === 'tl') {
          x = sx + e.translationX;
          y = sy + e.translationY;
          w = sw - e.translationX;
          h = sh - e.translationY;
        } else if (corner === 'tr') {
          y = sy + e.translationY;
          w = sw + e.translationX;
          h = sh - e.translationY;
        } else if (corner === 'bl') {
          x = sx + e.translationX;
          w = sw - e.translationX;
          h = sh + e.translationY;
        } else {
          w = sw + e.translationX;
          h = sh + e.translationY;
        }

        if (activeAspect) {
          const ratio = activeAspect[1] / activeAspect[0];
          const adjustedH = w * ratio;
          h = adjustedH;

          if (corner === 'tl') {
            y = sy + (sh - h);
          } else if (corner === 'tr') {
            y = sy + (sh - h);
          }
        }

        applyFrame(x, y, w, h);
      })
      .onEnd(() => {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      });

  const makeEdgeGesture = (edge: 'top' | 'right' | 'bottom' | 'left') =>
    Gesture.Pan()
      .onStart(() => {
        snapshotFrame();
      })
      .onUpdate((e) => {
        const sx = startFrameX.value;
        const sy = startFrameY.value;
        const sw = startFrameW.value;
        const sh = startFrameH.value;

        let x = sx;
        let y = sy;
        let w = sw;
        let h = sh;

        if (edge === 'left') {
          x = sx + e.translationX;
          w = sw - e.translationX;
        } else if (edge === 'right') {
          w = sw + e.translationX;
        } else if (edge === 'top') {
          y = sy + e.translationY;
          h = sh - e.translationY;
        } else {
          h = sh + e.translationY;
        }

        applyFrame(x, y, w, h);
      })
      .onEnd(() => {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      });

  const framePan = Gesture.Pan()
    .onStart(() => {
      snapshotFrame();
    })
    .onUpdate((e) => {
      const x = clampValue(startFrameX.value + e.translationX, 0, STAGE_WIDTH - frameW.value);
      const y = clampValue(startFrameY.value + e.translationY, 0, STAGE_HEIGHT - frameH.value);
      frameX.value = x;
      frameY.value = y;
      const next = clampTranslation(zoom.value, translateX.value, translateY.value, x, y, frameW.value, frameH.value);
      translateX.value = next.x;
      translateY.value = next.y;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const handleGestureTL = makeCornerGesture('tl');
  const handleGestureTR = makeCornerGesture('tr');
  const handleGestureBL = makeCornerGesture('bl');
  const handleGestureBR = makeCornerGesture('br');

  const handleGestureTop = makeEdgeGesture('top');
  const handleGestureRight = makeEdgeGesture('right');
  const handleGestureBottom = makeEdgeGesture('bottom');
  const handleGestureLeft = makeEdgeGesture('left');

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      const next = clampTranslation(
        zoom.value,
        savedTranslateX.value + e.translationX,
        savedTranslateY.value + e.translationY,
        frameX.value,
        frameY.value,
        frameW.value,
        frameH.value,
      );
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
      pinchOriginX.value = e.focalX - STAGE_WIDTH / 2;
      pinchOriginY.value = e.focalY - STAGE_HEIGHT / 2;
    })
    .onUpdate((e) => {
      const deltaScale = e.scale / lastPinchScale.value;
      lastPinchScale.value = e.scale;
      const nextZoom = Math.min(Math.max(zoom.value * deltaScale, minZoom), MAX_ZOOM);
      const factor = nextZoom / zoom.value;
      // Zoom towards the pinch focal point instead of the frame center.
      const nextX = pinchOriginX.value - (pinchOriginX.value - translateX.value) * factor;
      const nextY = pinchOriginY.value - (pinchOriginY.value - translateY.value) * factor;
      zoom.value = nextZoom;
      const next = clampTranslation(
        nextZoom,
        nextX,
        nextY,
        frameX.value,
        frameY.value,
        frameW.value,
        frameH.value,
      );
      translateX.value = next.x;
      translateY.value = next.y;
    })
    .onEnd(() => {
      savedZoom.value = zoom.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const target = zoom.value > minZoom * 1.8 ? minZoom : Math.min(MAX_ZOOM, minZoom * 2.2);
      const next = clampTranslation(
        target,
        translateX.value,
        translateY.value,
        frameX.value,
        frameY.value,
        frameW.value,
        frameH.value,
      );
      zoom.value = withTiming(target);
      translateX.value = withTiming(next.x);
      translateY.value = withTiming(next.y);
      savedZoom.value = target;
      savedTranslateX.value = next.x;
      savedTranslateY.value = next.y;
    });

  const composedGesture = Gesture.Simultaneous(doubleTapGesture, panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    width: imageWidth,
    height: imageHeight,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: zoom.value },
    ],
  }));

  const frameBoxStyle = useAnimatedStyle(() => ({
    width: frameW.value,
    height: frameH.value,
    left: frameX.value,
    top: frameY.value,
  }));

  const overlayTopStyle = useAnimatedStyle(() => ({
    left: 0,
    top: 0,
    width: STAGE_WIDTH,
    height: frameY.value,
  }));

  const overlayBottomStyle = useAnimatedStyle(() => ({
    left: 0,
    top: frameY.value + frameH.value,
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT - (frameY.value + frameH.value),
  }));

  const overlayLeftStyle = useAnimatedStyle(() => ({
    left: 0,
    top: frameY.value,
    width: frameX.value,
    height: frameH.value,
  }));

  const overlayRightStyle = useAnimatedStyle(() => ({
    left: frameX.value + frameW.value,
    top: frameY.value,
    width: STAGE_WIDTH - (frameX.value + frameW.value),
    height: frameH.value,
  }));

  const handleConfirm = async () => {
    if (!imageUri) return;
    setProcessing(true);
    try {
      const totalScale = zoom.value;
      const scaledWidth = imageWidth * totalScale;
      const scaledHeight = imageHeight * totalScale;
      const imageLeft = STAGE_WIDTH / 2 - scaledWidth / 2 + translateX.value;
      const imageTop = STAGE_HEIGHT / 2 - scaledHeight / 2 + translateY.value;

      const cropWidth = frameW.value / totalScale;
      const cropHeight = frameH.value / totalScale;
      const cropOriginX = clamp((frameX.value - imageLeft) / totalScale, 0, Math.max(0, imageWidth - cropWidth));
      const cropOriginY = clamp((frameY.value - imageTop) / totalScale, 0, Math.max(0, imageHeight - cropHeight));

      const context = ImageManipulator.manipulate(imageUri);
      context.crop({
        originX: cropOriginX,
        originY: cropOriginY,
        width: Math.min(cropWidth, imageWidth - cropOriginX),
        height: Math.min(cropHeight, imageHeight - cropOriginY),
      });
      const rendered = await context.renderAsync();
      const result = await rendered.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
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

          <View style={styles.frameWrap}>
            {imageUri ? (
              <View style={[styles.stage, { width: STAGE_WIDTH, height: STAGE_HEIGHT }]}>
                <GestureDetector gesture={composedGesture}>
                  <Animated.View style={[styles.imageLayer, animatedStyle]}>
                    <Animated.Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  </Animated.View>
                </GestureDetector>

                <View pointerEvents="none" style={styles.outsideOverlayWrap}>
                  <Animated.View style={[styles.overlayBlock, overlayTopStyle]} />
                  <Animated.View style={[styles.overlayBlock, overlayBottomStyle]} />
                  <Animated.View style={[styles.overlayBlock, overlayLeftStyle]} />
                  <Animated.View style={[styles.overlayBlock, overlayRightStyle]} />
                </View>

                <GestureDetector gesture={framePan}>
                  <Animated.View style={[styles.frameBox, frameBoxStyle]}>
                    <View pointerEvents="none" style={styles.gridOverlay}>
                      <View style={[styles.gridLineV, { left: '33.333%' }]} />
                      <View style={[styles.gridLineV, { left: '66.666%' }]} />
                      <View style={[styles.gridLineH, { top: '33.333%' }]} />
                      <View style={[styles.gridLineH, { top: '66.666%' }]} />
                    </View>

                    <View pointerEvents="none" style={[styles.frameBorder, { borderColor: theme.colors.primary }]} />

                    <GestureDetector gesture={handleGestureTL}>
                      <View style={[styles.handle, styles.handleTL, { borderColor: theme.colors.primary }]} />
                    </GestureDetector>
                    <GestureDetector gesture={handleGestureTR}>
                      <View style={[styles.handle, styles.handleTR, { borderColor: theme.colors.primary }]} />
                    </GestureDetector>
                    <GestureDetector gesture={handleGestureBL}>
                      <View style={[styles.handle, styles.handleBL, { borderColor: theme.colors.primary }]} />
                    </GestureDetector>
                    <GestureDetector gesture={handleGestureBR}>
                      <View style={[styles.handle, styles.handleBR, { borderColor: theme.colors.primary }]} />
                    </GestureDetector>

                    <GestureDetector gesture={handleGestureTop}>
                      <View style={styles.edgeTouchTop} />
                    </GestureDetector>
                    <GestureDetector gesture={handleGestureRight}>
                      <View style={styles.edgeTouchRight} />
                    </GestureDetector>
                    <GestureDetector gesture={handleGestureBottom}>
                      <View style={styles.edgeTouchBottom} />
                    </GestureDetector>
                    <GestureDetector gesture={handleGestureLeft}>
                      <View style={styles.edgeTouchLeft} />
                    </GestureDetector>
                  </Animated.View>
                </GestureDetector>
              </View>
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

          <Text style={styles.hint}>Drag frame to move · drag edges/corners to resize · pinch to zoom</Text>

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
  frameWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  stage: {
    position: 'relative',
    overflow: 'hidden',
  },
  imageLayer: {
    position: 'absolute',
    left: STAGE_WIDTH / 2,
    top: STAGE_HEIGHT / 2,
    marginLeft: -0.5,
    marginTop: -0.5,
  },
  outsideOverlayWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayBlock: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  frameBox: {
    position: 'absolute',
    zIndex: 2,
  },
  frameBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderRadius: 4,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  handle: {
    position: 'absolute',
    width: HANDLE_HIT_SIZE,
    height: HANDLE_HIT_SIZE,
    borderRadius: HANDLE_HIT_SIZE / 2,
    backgroundColor: '#fff',
    borderWidth: 3,
  },
  handleTL: {
    top: -HANDLE_HIT_SIZE / 2,
    left: -HANDLE_HIT_SIZE / 2,
  },
  handleTR: {
    top: -HANDLE_HIT_SIZE / 2,
    right: -HANDLE_HIT_SIZE / 2,
  },
  handleBL: {
    bottom: -HANDLE_HIT_SIZE / 2,
    left: -HANDLE_HIT_SIZE / 2,
  },
  handleBR: {
    bottom: -HANDLE_HIT_SIZE / 2,
    right: -HANDLE_HIT_SIZE / 2,
  },
  edgeTouchTop: {
    position: 'absolute',
    top: -10,
    left: 20,
    right: 20,
    height: 20,
  },
  edgeTouchRight: {
    position: 'absolute',
    top: 20,
    right: -10,
    bottom: 20,
    width: 20,
  },
  edgeTouchBottom: {
    position: 'absolute',
    bottom: -10,
    left: 20,
    right: 20,
    height: 20,
  },
  edgeTouchLeft: {
    position: 'absolute',
    top: 20,
    left: -10,
    bottom: 20,
    width: 20,
  },
  aspectRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
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
