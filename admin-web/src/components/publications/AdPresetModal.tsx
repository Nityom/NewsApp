import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Plus, Trash2, Upload, X } from 'lucide-react';
import type { AdPreset, PageAd } from '../../types/publication';
import { deleteAdPreset, getAllAdPresets, saveAdPreset } from '../../lib/publicationsStorage';

interface AdPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAd: (ad: PageAd) => void;
}

export const AdPresetModal: React.FC<AdPresetModalProps> = ({
  isOpen,
  onClose,
  onSelectAd,
}) => {
  const [presets, setPresets] = useState<AdPreset[]>([]);
  const [activeTab, setActiveTab] = useState<'library' | 'create'>('library');
  const [bannerName, setBannerName] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadPresets();
    }
  }, [isOpen]);

  const loadPresets = async () => {
    const list = await getAllAdPresets();
    setPresets(list);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!bannerName) {
      setBannerName(file.name.replace(/\.[^/.]+$/, ''));
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === 'string') {
        setBannerUrl(evt.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePreset = async () => {
    if (!bannerUrl.trim()) {
      alert('Please upload or enter an ad image URL');
      return;
    }
    const name = bannerName.trim() || 'Ad Banner';
    const preset: AdPreset = {
      id: `ad_preset_${Date.now()}`,
      name,
      ad: {
        type: 'image',
        imageUrl: bannerUrl,
        name,
        fit: 'fill',
      },
      createdAt: Date.now(),
    };
    await saveAdPreset(preset);
    await loadPresets();
    setActiveTab('library');
    setBannerName('');
    setBannerUrl('');
  };

  const handleDeletePreset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this banner from the library?')) {
      await deleteAdPreset(id);
      await loadPresets();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50">
          <div>
            <h2 className="text-base font-bold text-stone-900 m-0">Ad Banner Library</h2>
            <span className="text-xs text-stone-500">
              Save and insert advertiser banner images across your publication pages
            </span>
          </div>
          <button
            type="button"
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-md transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-100/70 px-4 pt-2 gap-2">
          <button
            type="button"
            className={`px-3.5 py-2 text-xs font-bold rounded-t-md border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'library'
                ? 'bg-white text-red-700 border-red-700 shadow-sm'
                : 'text-stone-500 hover:text-stone-800 border-transparent'
            }`}
            onClick={() => setActiveTab('library')}
          >
            Saved Banners ({presets.length})
          </button>
          <button
            type="button"
            className={`px-3.5 py-2 text-xs font-bold rounded-t-md border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'create'
                ? 'bg-white text-red-700 border-red-700 shadow-sm'
                : 'text-stone-500 hover:text-stone-800 border-transparent'
            }`}
            onClick={() => setActiveTab('create')}
          >
            <Plus size={14} /> Upload New Banner
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'library' ? (
            presets.length === 0 ? (
              <div className="text-center py-12 px-4 text-stone-500">
                <ImageIcon className="mx-auto mb-2 text-stone-300" size={36} />
                <p className="mb-3 text-sm font-medium">No saved banner images yet.</p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-md text-sm font-semibold transition-colors shadow-sm cursor-pointer"
                  onClick={() => setActiveTab('create')}
                >
                  <Plus size={15} /> Upload First Banner
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {presets.map((item) => {
                  const img = item.ad?.imageUrl;
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-stone-200 hover:border-red-600 hover:shadow-md transition-all cursor-pointer bg-white group flex items-center gap-3"
                      onClick={() => {
                        onSelectAd({
                          type: 'image',
                          imageUrl: img,
                          name: item.name,
                        });
                        onClose();
                      }}
                    >
                      <div className="w-24 h-16 bg-stone-100 rounded border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                        {img ? (
                          <img src={img} alt={item.name} className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon size={20} className="text-stone-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <strong className="text-sm font-bold text-stone-900 group-hover:text-red-700 transition-colors block truncate">
                          {item.name}
                        </strong>
                        <span className="text-[11px] text-stone-500">
                          Click to apply this banner to the active page
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          className="px-3 py-1.5 text-xs font-semibold bg-stone-100 group-hover:bg-red-50 group-hover:text-red-700 text-stone-700 rounded transition-colors"
                        >
                          Use Banner
                        </button>
                        <button
                          type="button"
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          onClick={(e) => handleDeletePreset(item.id, e)}
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Banner Name / Advertiser Title
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
                  placeholder="e.g. RS Cellular Bottom Banner"
                  value={bannerName}
                  onChange={(e) => setBannerName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Upload Banner Image
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-stone-300 hover:border-red-600 rounded-lg p-5 cursor-pointer bg-stone-50 hover:bg-red-50/30 transition-all text-center">
                  <Upload size={22} className="text-stone-400 mb-1" />
                  <span className="text-xs font-semibold text-stone-700">
                    Click to browse and upload image file (PNG, JPG, WebP)
                  </span>
                  <span className="text-[11px] text-stone-500 mt-0.5">
                    Recommended: high-resolution landscape banner
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Or Image URL
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
                  placeholder="https://example.com/ad-banner.png"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                />
              </div>

              {bannerUrl && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Preview</label>
                  <div className="h-28 bg-stone-50 rounded-lg border border-stone-200 p-2 flex items-center justify-center overflow-hidden">
                    <img src={bannerUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-stone-200 bg-stone-50">
          <button
            type="button"
            className="px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-200 rounded-md transition-colors cursor-pointer"
            onClick={onClose}
          >
            Close
          </button>
          {activeTab === 'create' && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-md text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              onClick={handleSavePreset}
            >
              Save to Library
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
