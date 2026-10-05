import { ClientOnly } from "@tanstack/react-router";
import { MediaPicker } from "@/features/media/components/media-library/components";
import { m } from "@/paraglide/messages";

interface ImageModalProps {
  open: boolean;
  returnFocus?: () => HTMLElement | null;
  onClose: () => void;
  onSelect: (image: { src: string; width?: number; height?: number }) => void;
}

/** Picks an image to insert from the media library. */
export function ImageModal({
  open,
  returnFocus,
  onClose,
  onSelect,
}: ImageModalProps) {
  return (
    <ClientOnly>
      <MediaPicker
        open={open}
        title={m.editor_insert_media_title()}
        allowUrlImport
        onClose={onClose}
        returnFocus={returnFocus}
        onSelect={(media) => {
          onSelect({
            src: media.url,
            width: media.width || undefined,
            height: media.height || undefined,
          });
          onClose();
        }}
      />
    </ClientOnly>
  );
}
