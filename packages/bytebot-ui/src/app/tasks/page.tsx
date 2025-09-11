"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { TaskItem } from "@/components/tasks/TaskItem";
import { TAB_CONFIGS, TabKey, TaskTabs } from "@/components/tasks/TaskTabs";
import { Pagination } from "@/components/ui/pagination";
import { fetchTaskCounts, fetchTasks } from "@/utils/taskUtils";
import { Task } from "@/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { logError } from "@/utils/logger";

function TasksPageContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize activeTab from URL params
  const getInitialTab = (): TabKey => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam !== null &&
      tabParam.length > 0 &&
      Object.keys(TAB_CONFIGS).includes(tabParam)
    ) {
      return tabParam as TabKey;
    }
    return "ALL";
  };

  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [taskCounts, setTaskCounts] = useState<Record<TabKey, number>>({
    ALL: 0,
    ACTIVE: 0,
    COMPLETED: 0,
    CANCELLED_FAILED: 0,
  });
  const PAGE_SIZE = 10;

  useEffect(() => {
    const loadTasks = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const statuses =
          activeTab === "ALL" ? undefined : TAB_CONFIGS[activeTab].statuses;
        const fetchParams: {
          page: number;
          limit: number;
          statuses?: string[];
        } = {
          page: currentPage,
          limit: PAGE_SIZE,
        };

        if (statuses !== undefined) {
          fetchParams.statuses = statuses.map((status) => status.toString());
        }

        const result = await fetchTasks(fetchParams);
        setTasks(result.tasks);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (_error) {
        // TODO: Add proper error logging service
        // console.error("Failed to load tasks:", _error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks().catch((error: unknown) => {
      logError("Failed to load tasks for page", error, "TasksPage");
    });
  }, [currentPage, activeTab]);

  useEffect(() => {
    const loadTaskCounts = async (): Promise<void> => {
      try {
        const counts = await fetchTaskCounts();
        setTaskCounts(counts);
      } catch (_error) {
        // TODO: Add proper error logging service
        // console.error("Failed to load task counts:", _error);
      }
    };

    loadTaskCounts().catch((error: unknown) => {
      logError("Failed to load task counts", error, "TasksPage");
    });
  }, []);

  // Sync activeTab with URL params when they change
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const newTab: TabKey =
      tabParam !== null &&
      tabParam.length > 0 &&
      Object.keys(TAB_CONFIGS).includes(tabParam)
        ? (tabParam as TabKey)
        : "ALL";

    if (newTab !== activeTab) {
      setActiveTab(newTab);
      setCurrentPage(1);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tab: TabKey): void => {
    setActiveTab(tab);
    setCurrentPage(1);

    // Update URL with the new tab
    const newSearchParams = new URLSearchParams(searchParams);
    if (tab === "ALL") {
      newSearchParams.delete("tab");
    } else {
      newSearchParams.set("tab", tab);
    }

    const newUrl = `/tasks${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ""}`;
    router.push(newUrl, { scroll: false });
  };

  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />

      <main className="flex-1 overflow-scroll px-6 pt-6 pb-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-6 text-xl font-medium">Tasks</h1>

          {!isLoading && (
            <TaskTabs
              activeTab={activeTab}
              onTabChange={handleTabChange}
              taskCounts={taskCounts}
            />
          )}

          {((): React.JSX.Element => {
            if (isLoading) {
              return (
                <div className="p-8 text-center">
                  <div className="border-bytebot-bronze-light-5 border-t-bytebot-bronze mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4"></div>
                  <p className="text-gray-500">Loading tasks...</p>
                </div>
              );
            }

            if (tasks.length === 0) {
              return (
                <div className="bg-bytebot-bronze-light-2 border-bytebot-bronze-light-7 rounded-xl border p-8 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <h3 className="text-bytebot-bronze-light-12 mb-1 text-lg font-medium">
                      No tasks yet
                    </h3>
                    <p className="text-bytebot-bronze-light-11 mb-6 text-sm">
                      Get started by creating a first task
                    </p>
                    <Link href="/">
                      <Button className="bg-bytebot-bronze-dark-7 hover:bg-bytebot-bronze-dark-6 text-white">
                        + New Task
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            }

            return (
              <>
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    total={total}
                    pageSize={PAGE_SIZE}
                  />
                )}
              </>
            );
          })()}
        </div>
      </main>
    </div>
  );
}

function TasksPageFallback(): React.JSX.Element {
  return (
    <div className="p-8 text-center">
      <div className="border-bytebot-bronze-light-5 border-t-bytebot-bronze mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4"></div>
      <p className="text-gray-500">Loading tasks...</p>
    </div>
  );
}

export default function TasksPage(): React.JSX.Element {
  return (
    <Suspense fallback={<TasksPageFallback />}>
      <TasksPageContent />
    </Suspense>
  );
}
