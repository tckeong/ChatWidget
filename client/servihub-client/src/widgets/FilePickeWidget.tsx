import React, { useState } from "react";
import { type attachment as Attachment } from "./ChatWidget";
import { Paperclip, Send, File, FileText, Image as ImageIcon, Video, Music, X } from 'lucide-react';

interface FileObject {
    id: string;
    file: File;
    name: string;
    size: number;
    type: string;
    preview: string | null;
}

interface ImageDimensions {
    width: number;
    height: number;
}

interface ConversionResult {
    attachments: Attachment[];
    errors: string[];
}

class ImageDimensionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ImageDimensionError';
    }
}

const isImageFile = (file: File): boolean => {
    return file.type.startsWith('image/');
};

// Converts a File object to an Attachment object
const convertFileToAttachment = async (file: File): Promise<Attachment> => {
    const attachment: Attachment = {
        url: URL.createObjectURL(file),
        mimeType: file.type,
        sizeBytes: file.size
    };

    if (isImageFile(file)) {
        try {
            const dimensions = await getImageDimensions(file);
            attachment.width = dimensions.width;
            attachment.height = dimensions.height;
        } catch (error) {
            console.warn(`Could not get image dimensions for ${file.name}:`, error);
        }
    }

    return attachment;
};

const getImageDimensions = (file: File): Promise<ImageDimensions> => {
    return new Promise<ImageDimensions>((resolve, reject) => {
        if (!isImageFile(file)) {
            reject(new ImageDimensionError('File is not an image'));
            return;
        }

        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = (): void => {
            URL.revokeObjectURL(url);
            resolve({
                width: img.naturalWidth,
                height: img.naturalHeight
            });
        };

        img.onerror = (): void => {
            URL.revokeObjectURL(url);
            reject(new ImageDimensionError('Failed to load image'));
        };

        img.src = url;
    });
};

const convertFilesToAttachments = async (files: FileObject[]): Promise<ConversionResult> => {
    const attachments: Attachment[] = [];
    const errors: string[] = [];

    for (const file of files) {
        try {
            const attachment: Attachment = await convertFileToAttachment(file.file);
            attachments.push(attachment);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(`Failed to convert ${file.name}: ${errorMessage}`);
        }
    }

    return { attachments, errors };
};

const validateFileSize = (file: File, maxSizeBytes: number): boolean => {
    return file.size <= maxSizeBytes;
};

interface FilePickerWidgetProps {
    onFilesSelected: (attachments: Attachment[]) => void;
    maxFileSize?: number;
    messageInput: string;
    setMessageInput: (value: string) => void;
    handleTyping: () => void;
    handleMessageSend?: () => void;
}

export const FilePickerWidget: React.FC<FilePickerWidgetProps> = ({
    onFilesSelected,
    maxFileSize = 10 * 1024 * 1024,
    messageInput,
    setMessageInput,
    handleTyping,
    handleMessageSend,
}) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [selectedFiles, setSelectedFiles] = useState<FileObject[]>([]);

    const triggerFileInput = (accept: string = "*/*"): void => {
        if (fileInputRef.current) {
            fileInputRef.current.accept = accept;
            fileInputRef.current.click();
        }
    };

    const getFileIcon = (fileType: string) => {
        if (fileType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
        if (fileType.startsWith('video/')) return <Video className="w-4 h-4" />;
        if (fileType.startsWith('audio/')) return <Music className="w-4 h-4" />;
        if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) {
            return <FileText className="w-4 h-4" />;
        }
        return <File className="w-4 h-4" />;
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const files = Array.from(event.target.files || []);
        const validFiles: FileObject[] = [];

        files.forEach((file: File) => {
            if (!validateFileSize(file, maxFileSize)) {
                console.warn(`File too large: ${file.name} (${file.size} bytes)`);
                return;
            }

            const fileObject: FileObject = {
                id: Math.random().toString(36).substr(2, 9),
                file: file,
                name: file.name,
                size: file.size,
                type: file.type,
                preview: isImageFile(file) ? URL.createObjectURL(file) : null
            };

            validFiles.push(fileObject);
        });

        if (validFiles.length > 0) {
            setSelectedFiles(prev => [...prev, ...validFiles]);
            const result = await convertFilesToAttachments(validFiles);
            if (result.errors.length > 0) {
                console.error('Conversion errors:', result.errors);
            }
            onFilesSelected?.(result.attachments);
        }
    };

    const removeFile = (fileId: string): void => {
        setSelectedFiles(prev => {
            const updatedFiles = prev.filter(f => f.id !== fileId);
            // Clean up object URLs to prevent memory leaks
            const fileToRemove = prev.find(f => f.id === fileId);
            if (fileToRemove?.preview) {
                URL.revokeObjectURL(fileToRemove.preview);
            }
            return updatedFiles;
        });
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };


    return (
        <div className="bg-gray-100 border-t border-gray-500 p-4">
            {/* Selected Files Display */}
            {selectedFiles.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium text-blue-800 mb-2">
                        Selected Files ({selectedFiles.length})
                    </div>
                    <div className="space-y-2">
                        {selectedFiles.map((fileObj: FileObject) => (
                            <div key={fileObj.id} className="flex items-center justify-between bg-white p-2 rounded border">
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    {fileObj.preview ? (
                                        <img
                                            src={fileObj.preview}
                                            alt={fileObj.name}
                                            className="w-8 h-8 object-cover rounded border"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 bg-gray-100 rounded border flex items-center justify-center text-gray-600">
                                            {getFileIcon(fileObj.type)}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 truncate">
                                            {fileObj.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {formatFileSize(fileObj.size)}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFile(fileObj.id)}
                                    className="ml-2 p-1 hover:bg-red-100 rounded-full text-red-600 hover:text-red-800 transition-colors"
                                    aria-label={`Remove ${fileObj.name}`}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex items-center space-x-3">
                <button className="p-2 hover:bg-gray-100 rounded-full hover:cursor-pointer" onClick={() => triggerFileInput()}>
                    <Paperclip className="w-5 h-5 text-gray-600" />
                </button>

                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onFocus={handleTyping}
                        placeholder="Write a message..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleMessageSend ? handleMessageSend() : null;
                            }
                        }}
                    />
                </div>

                <button className="p-3 bg-blue-500 hover:bg-blue-600 rounded-full" onClick={handleMessageSend}>
                    <Send className="w-5 h-5 text-white" />
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-hidden="true"
                />
            </div>
        </div >
    );
};

export default FilePickerWidget;
