import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/api/api";
import type { ApiSuccess } from "@/types/api";

export type UploadedFile = {
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  type: "IMAGE" | "FILE";
};

export type UploadResponse = ApiSuccess<{
  files: UploadedFile[];
}>;

export const attachmentService = {
  uploadFiles: async (files: File[], folder: 'user' | 'message' | 'task' = 'task'): Promise<UploadResponse> => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    return apiRequest.post<UploadResponse>(`/upload?folder=${folder}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

export const useUploadFiles = () => {
  return useMutation({
    mutationKey: ["uploadFiles"],
    mutationFn: ({ files, folder }: { files: File[]; folder?: 'user' | 'message' | 'task' }) => 
      attachmentService.uploadFiles(files, folder),
  });
};
