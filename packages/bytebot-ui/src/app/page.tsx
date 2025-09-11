"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { ChatInput } from "@/components/messages/ChatInput";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { startTask } from "@/utils/taskUtils";
import { FileWithBase64, Model, validateUploadedFiles } from "@/types";
import { TaskList } from "@/components/tasks/TaskList";
import { logError, logInfo } from "@/utils/logger";

interface StockPhotoProps {
  src: string;
  alt?: string;
}

/**
 * Optimized stock photo component with React.memo for performance
 * Only re-renders when src or alt props change
 */
const StockPhoto: React.FC<StockPhotoProps> = React.memo(
  ({ src, alt = "Decorative image" }) => {
    return (
      <div className="h-full w-full overflow-hidden rounded-lg bg-white">
        <div className="relative h-full w-full">
          <Image src={src} alt={alt} fill className="object-cover" priority />
        </div>
      </div>
    );
  },
);

// FileWithBase64 interface is imported from @/types - removing duplicate definition

export default function Home(): React.JSX.Element {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<FileWithBase64[]>([]);
  const router = useRouter();
  const [activePopoverIndex, setActivePopoverIndex] = useState<number | null>(
    null,
  );
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/tasks/models")
      .then((res) => res.json())
      .then((data: Model[]) => {
        setModels(data);
        if (data.length > 0 && data[0]) {
          setSelectedModel(data[0]);
        }
      })
      .catch((_err) => {
        // TODO: Add proper error logging service
        // console.error("Failed to load models", _err);
      });
  }, []);

  // Close popover when clicking outside or pressing ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonsRef.current &&
        !buttonsRef.current.contains(event.target as Node)
      ) {
        setActivePopoverIndex(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setActivePopoverIndex(null);
      }
    };

    if (activePopoverIndex !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return (): void => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePopoverIndex]);

  const handleSendAsync = async (): Promise<void> => {
    if (!input.trim()) {
      return;
    }

    setIsLoading(true);

    try {
      if (!selectedModel) {
        throw new Error("No model selected");
      }
      // Send request to start a new task
      const taskData: {
        description: string;
        model: Model;
        files?: FileWithBase64[];
      } = {
        description: input,
        model: selectedModel,
      };

      // Include files if any are uploaded
      if (uploadedFiles.length > 0) {
        taskData.files = uploadedFiles;
      }

      const task = await startTask(taskData);

      if (task?.id != null) {
        // Redirect to the task page
        router.push(`/tasks/${task.id}`);
      } else {
        // Handle error
        // TODO: Add proper error logging service
        // console.error("Failed to create task");
      }
    } catch (_error) {
      // TODO: Add proper error logging service
      // console.error("Error sending message:", _error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (): void => {
    handleSendAsync().catch((error: unknown) => {
      // Handle async error
      logError("Failed to send message from main page", error, "MainPage");
    });
  };

  /**
   * Enhanced file upload handler with comprehensive validation and security
   * @param fileList - Array of uploaded file objects to validate
   */
  const handleFileUpload = (fileList: FileWithBase64[]): void => {
    // Validate and sanitize uploaded files for security
    const validatedFiles = validateUploadedFiles(fileList);

    // Log validation results for debugging
    logInfo(
      `File upload validation: ${fileList.length} received, ${validatedFiles.length} valid`,
      { receivedCount: fileList.length, validatedCount: validatedFiles.length },
      "MainPage",
    );

    setUploadedFiles(validatedFiles);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Desktop grid layout (50/50 split) - only visible on large screens */}
        <div className="hidden h-full p-8 lg:grid lg:grid-cols-2 lg:gap-8">
          {/* Main content area */}
          <div className="flex flex-col items-center overflow-y-auto">
            <div className="flex w-full max-w-xl flex-col items-center">
              <div className="mb-6 flex w-full flex-col items-start justify-start">
                <h1 className="text-bytebot-bronze-light-12 mb-1 text-2xl">
                  What can I help you get done?
                </h1>
              </div>

              <div className="bg-bytebot-bronze-light-2 border-bytebot-bronze-light-7 mb-10 w-full rounded-2xl border p-2">
                <ChatInput
                  input={input}
                  isLoading={isLoading}
                  onInputChange={setInput}
                  onSend={handleSend}
                  onFileUpload={handleFileUpload}
                  minLines={3}
                />
                <div className="mt-2">
                  <Select
                    {...(selectedModel?.name != null &&
                      selectedModel.name.length > 0 && {
                        value: selectedModel.name,
                      })}
                    onValueChange={(val) => {
                      setSelectedModel(
                        models.find((m) => m.name === val) ?? null,
                      );
                    }}
                  >
                    <SelectTrigger className="w-auto">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m.name} value={m.name}>
                          {m.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TaskList
                className="w-full"
                title="Latest Tasks"
                description="You'll see tasks that are completed, scheduled, or require your attention."
              />
            </div>
          </div>

          {/* Stock photo area - centered in its grid cell */}
          <div className="flex items-center justify-center px-6 pt-6">
            <div className="aspect-square h-full w-full max-w-md xl:max-w-2xl">
              <StockPhoto src="/stock-1.png" alt="Bytebot stock image" />
            </div>
          </div>
        </div>

        {/* Mobile layout - only visible on small/medium screens */}
        <div className="flex h-full flex-col lg:hidden">
          <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 pt-10">
            <div className="flex w-full max-w-xl flex-col items-center pb-10">
              <div className="mb-6 flex w-full flex-col items-start justify-start">
                <h1 className="text-bytebot-bronze-light-12 mb-1 text-2xl">
                  What can I help you get done?
                </h1>
              </div>

              <div className="bg-bytebot-bronze-light-2 border-bytebot-bronze-light-5 borderw-full mb-10 rounded-2xl p-2">
                <ChatInput
                  input={input}
                  isLoading={isLoading}
                  onInputChange={setInput}
                  onSend={handleSend}
                  onFileUpload={handleFileUpload}
                  minLines={3}
                />
                <div className="mt-2">
                  <Select
                    {...(selectedModel?.name != null &&
                      selectedModel.name.length > 0 && {
                        value: selectedModel.name,
                      })}
                    onValueChange={(val) => {
                      setSelectedModel(
                        models.find((m) => m.name === val) ?? null,
                      );
                    }}
                  >
                    <SelectTrigger className="w-auto">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m.name} value={m.name}>
                          {m.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TaskList
                className="w-full"
                title="Latest Tasks"
                description="You'll see tasks that are completed, scheduled, or require your attention."
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
