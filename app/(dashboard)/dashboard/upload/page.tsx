import { UploadDropzone } from "@/components/upload-dropzone";

export default function UploadPage() {
  return (
    <>
      <div className="flex h-[52px] items-center border-b border-border px-6">
        <span className="text-sm font-medium">Nouvelle vidéo</span>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-xl">
          <UploadDropzone />
        </div>
      </div>
    </>
  );
}
