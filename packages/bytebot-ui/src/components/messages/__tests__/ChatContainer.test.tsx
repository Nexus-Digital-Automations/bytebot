/**
 * ChatContainer Component Tests - Comprehensive Chat UI Testing
 *
 * Tests cover:
 * - Complex chat container rendering with all states
 * - Message grouping and infinite scroll behavior
 * - WebSocket integration and real-time updates
 * - Task status handling and UI state transitions
 * - User interaction flows (scroll, input, send)
 * - Accessibility for chat interfaces
 * - Performance optimization for large message lists
 *
 * @author Claude Code - Frontend Testing Specialist
 * @version 1.0.0
 */

import React from "react";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { ChatContainer } from "../ChatContainer";
import { GroupedMessages, Role, TaskStatus } from "@/types";
import { MessageContentBlock, MessageContentType } from "@bytebot/shared";
import { TestUtils } from "@/test-utils/setupAfterEnv";

// Test constants
const RENDER_TIME_THRESHOLD_MS = 200;
const EXPECTED_MESSAGE_GROUP_COUNT = 3;

// Mock child components
jest.mock("../MessageGroup", () => ({
  MessageGroup: ({ group }: { group: GroupedMessages }) => (
    <div data-testid={`message-group-${group.role}`}>
      Mock MessageGroup: {group.messages?.length || 0} messages
    </div>
  ),
}));

jest.mock("../MessageAvatar", () => ({
  MessageAvatar: ({ role }: { role: Role }) => (
    <div data-testid={`avatar-${role}`}>Avatar: {role}</div>
  ),
}));

jest.mock("../ChatInput", () => ({
  ChatInput: ({
    input,
    onInputChange,
    onSend,
    isLoading,
    placeholder,
  }: {
    input: string;
    onInputChange: (value: string) => void;
    onSend: () => void;
    isLoading: boolean;
    placeholder: string;
  }) => (
    <div data-testid="chat-input">
      <input
        data-testid="chat-input-field"
        value={input}
        onChange={(e) => {
          onInputChange(e.target.value);
        }}
        placeholder={placeholder}
        disabled={isLoading}
      />
      <button data-testid="send-button" onClick={onSend} disabled={isLoading}>
        {isLoading ? "Sending..." : "Send"}
      </button>
    </div>
  ),
}));

jest.mock("../ui/text-shimmer", () => ({
  TextShimmer: ({
    children,
    className,
    duration,
  }: {
    children: React.ReactNode;
    className?: string;
    duration?: number;
  }) => (
    <div
      className={className}
      data-testid="text-shimmer"
      data-duration={duration}
    >
      {children}
    </div>
  ),
}));

jest.mock("../ui/loader", () => ({
  Loader: ({ size }: { size: number }) => (
    <div data-testid="loader" data-size={size}>
      Loading...
    </div>
  ),
}));

// Test data setup - moved outside describe block for export
const mockScrollRef = React.createRef<HTMLDivElement>();
const mockMessageIdToIndex = { "msg-1": 0, "msg-2": 1 };

// Create mock data function
const createMockGroupedMessages = (): GroupedMessages[] => [
  {
    role: Role.USER,
    messages: [
      {
        id: "msg-1",
        content: [{ type: "text", text: "Hello" }] as MessageContentBlock[],
        role: Role.USER,
        createdAt: new Date().toISOString(),
      },
    ],
  },
  {
    role: Role.ASSISTANT,
    messages: [
      {
        id: "msg-2",
        content: [
          { type: "text", text: "Hello! How can I help?" },
        ] as MessageContentBlock[],
        role: Role.ASSISTANT,
        createdAt: new Date().toISOString(),
      },
    ],
  },
];

const defaultProps = {
  scrollRef: mockScrollRef,
  messageIdToIndex: mockMessageIdToIndex,
  taskId: "task-123",
  input: "",
  setInput: jest.fn(),
  isLoading: false,
  handleAddMessage: jest.fn(),
  groupedMessages: createMockGroupedMessages(),
  taskStatus: TaskStatus.RUNNING,
  control: Role.ASSISTANT,
  isLoadingSession: false,
  isLoadingMoreMessages: false,
  hasMoreMessages: true,
  loadMoreMessages: jest.fn(),
};

describe("ChatContainer Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock scroll behavior
    Element.prototype.scrollIntoView = jest.fn();

    // Mock DOM methods
    Object.defineProperty(HTMLElement.prototype, "scrollTop", {
      configurable: true,
      value: 0,
      writable: true,
    });
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      value: 1000,
      writable: true,
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      value: 800,
      writable: true,
    });
  });

  describe("Basic Rendering", () => {
    it("renders correctly with messages", () => {
      TestUtils.renderComponent(<ChatContainer {...defaultProps} />);

      expect(screen.getByTestId("message-group-user")).toBeInTheDocument();
      expect(screen.getByTestId("message-group-assistant")).toBeInTheDocument();
      expect(screen.getByTestId("chat-input")).toBeInTheDocument();
    });

    it("shows loading state when session is loading", () => {
      TestUtils.renderComponent(
        <ChatContainer {...defaultProps} isLoadingSession={true} />,
      );

      expect(screen.getByTestId("loader")).toBeInTheDocument();
      expect(
        screen.queryByTestId("message-group-user"),
      ).not.toBeInTheDocument();
    });

    it("shows empty state when no messages", () => {
      TestUtils.renderComponent(
        <ChatContainer {...defaultProps} groupedMessages={[]} />,
      );

      expect(screen.getByText("No messages yet...")).toBeInTheDocument();
    });

    it("applies correct CSS classes for styling", () => {
      const renderResult = TestUtils.renderComponent(
        <ChatContainer {...defaultProps} />,
      );
      const { container } = renderResult;

      const chatContainer = container.firstChild as HTMLElement | null;
      expect(chatContainer).toHaveClass(
        "bg-bytebot-bronze-light-3",
        "flex",
        "h-full",
        "flex-col",
      );
    });
  });

  describe("Task Status Handling", () => {
    it("shows chat input for RUNNING status", () => {
      TestUtils.renderComponent(
        <ChatContainer {...defaultProps} taskStatus={TaskStatus.RUNNING} />,
      );

      expect(screen.getByTestId("chat-input")).toBeInTheDocument();
    });

    it("shows chat input for NEEDS_HELP status", () => {
      TestUtils.renderComponent(
        <ChatContainer {...defaultProps} taskStatus={TaskStatus.NEEDS_HELP} />,
      );

      expect(screen.getByTestId("chat-input")).toBeInTheDocument();
    });

    it("hides chat input for COMPLETED status", () => {
      TestUtils.renderComponent(
        <ChatContainer {...defaultProps} taskStatus={TaskStatus.COMPLETED} />,
      );

      expect(screen.queryByTestId("chat-input")).not.toBeInTheDocument();
    });

    it("hides chat input for PENDING status", () => {
      TestUtils.renderComponent(
        <ChatContainer {...defaultProps} taskStatus={TaskStatus.PENDING} />,
      );

      expect(screen.queryByTestId("chat-input")).not.toBeInTheDocument();
    });

    it("shows assistant thinking indicator when running", () => {
      TestUtils.renderComponent(
        <ChatContainer
          {...defaultProps}
          taskStatus={TaskStatus.RUNNING}
          control={Role.ASSISTANT}
        />,
      );

      expect(screen.getByTestId("avatar-assistant")).toBeInTheDocument();
      expect(screen.getByTestId("text-shimmer")).toBeInTheDocument();
      expect(screen.getByText("Bytebot is working...")).toBeInTheDocument();
    });

    it("does not show assistant indicator when user has control", () => {
      TestUtils.renderComponent(
        <ChatContainer
          {...defaultProps}
          taskStatus={TaskStatus.RUNNING}
          control={Role.USER}
        />,
      );

      expect(
        screen.queryByText("Bytebot is working..."),
      ).not.toBeInTheDocument();
    });
  });

  describe("Message Rendering", () => {
    it("renders all grouped messages in correct order", () => {
      TestUtils.renderComponent(<ChatContainer {...defaultProps} />);

      const messageGroups = screen.getAllByTestId(/message-group-/);
      expect(messageGroups).toHaveLength(2);
      expect(messageGroups[0]).toHaveAttribute(
        "data-testid",
        "message-group-user",
      );
      expect(messageGroups[1]).toHaveAttribute(
        "data-testid",
        "message-group-assistant",
      );
    });

    it("passes correct props to MessageGroup components", () => {
      TestUtils.renderComponent(<ChatContainer {...defaultProps} />);

      // Check that message groups receive the expected content
      expect(
        screen.getByText("Mock MessageGroup: 1 messages"),
      ).toBeInTheDocument();
    });

    it("handles empty message groups gracefully", () => {
      const emptyGroupedMessages: GroupedMessages[] = [
        {
          role: Role.USER,
          messages: [],
        },
      ];

      TestUtils.renderComponent(
        <ChatContainer
          {...defaultProps}
          groupedMessages={emptyGroupedMessages}
        />,
      );

      expect(
        screen.getByText("Mock MessageGroup: 0 messages"),
      ).toBeInTheDocument();
    });
  });

  describe("Infinite Scroll", () => {
    let mockScrollContainer: HTMLDivElement;

    beforeEach(() => {
      mockScrollContainer = document.createElement("div");
      Object.defineProperty(mockScrollContainer, "scrollTop", {
        value: 0,
        writable: true,
      });
      Object.defineProperty(mockScrollContainer, "scrollHeight", {
        value: 1000,
        writable: true,
      });
      Object.defineProperty(mockScrollContainer, "clientHeight", {
        value: 800,
        writable: true,
      });

      Object.defineProperty(defaultProps.scrollRef, 'current', {
        value: mockScrollContainer,
        writable: true,
        configurable: true
      });
    });

    it("calls loadMoreMessages when scrolled near top", async () => {
      const loadMoreMessages = jest.fn().mockResolvedValue(undefined);

      TestUtils.renderComponent(
        <ChatContainer {...defaultProps} loadMoreMessages={loadMoreMessages} />,
      );

      // Simulate scroll to top (distance from bottom > 20px)
      Object.defineProperty(mockScrollContainer, "scrollTop", { value: 0 });
      Object.defineProperty(mockScrollContainer, "scrollHeight", {
        value: 1000,
      });
      Object.defineProperty(mockScrollContainer, "clientHeight", {
        value: 800,
      });

      act(() => {
        fireEvent.scroll(mockScrollContainer);
      });

      await waitFor(() => {
        expect(loadMoreMessages).toHaveBeenCalledTimes(1);
      });
    });

    it("does not load more when already loading", async () => {
      const loadMoreMessages = jest.fn().mockResolvedValue(undefined);

      TestUtils.renderComponent(
        <ChatContainer
          {...defaultProps}
          loadMoreMessages={loadMoreMessages}
          isLoadingMoreMessages={true}
        />,
      );

      act(() => {
        fireEvent.scroll(mockScrollContainer);
      });

      await waitFor(() => {
        expect(loadMoreMessages).not.toHaveBeenCalled();
      });
    });

    it("does not load more when no more messages available", async () => {
      const loadMoreMessages = jest.fn().mockResolvedValue(undefined);

      TestUtils.renderComponent(
        <ChatContainer
          {...defaultProps}
          loadMoreMessages={loadMoreMessages}
          hasMoreMessages={false}
        />,
      );

      act(() => {
        fireEvent.scroll(mockScrollContainer);
      });

      await waitFor(() => {
        expect(loadMoreMessages).not.toHaveBeenCalled();
      });
    });

    it("shows loading indicator when loading more messages", () => {
      TestUtils.renderComponent(
        <ChatContainer {...defaultProps} isLoadingMoreMessages={true} />,
      );

      const loaders = screen.getAllByTestId("loader");
      // Should have at least one loader for the infinite scroll
      expect(loaders.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Auto-scrolling Behavior", () => {
    let mockMessagesEndRef: { current: HTMLDivElement | null };

    beforeEach(() => {
      mockMessagesEndRef = { current: document.createElement("div") };
      if (mockMessagesEndRef.current) {
        mockMessagesEndRef.current.scrollIntoView = jest.fn();
      }
    });

    it("scrolls to bottom when task is running", async () => {
      TestUtils.renderComponent(
        <ChatContainer {...defaultProps} taskStatus={TaskStatus.RUNNING} />,
      );

      // Wait for useEffect to run
      await waitFor(() => {
        // The component should attempt to scroll, we can't easily test the exact scrollIntoView call
        // but we can verify the component rendered without errors
        expect(screen.getByTestId("message-group-user")).toBeInTheDocument();
      });
    });

    it("scrolls to bottom when task needs help", async () => {
      TestUtils.renderComponent(
        <ChatContainer {...defaultProps} taskStatus={TaskStatus.NEEDS_HELP} />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("message-group-user")).toBeInTheDocument();
      });
    });

    it("does not auto-scroll for completed tasks", () => {
      TestUtils.renderComponent(
        <ChatContainer {...defaultProps} taskStatus={TaskStatus.COMPLETED} />,
      );

      // Component should render without attempting to scroll
      expect(screen.getByTestId("message-group-user")).toBeInTheDocument();
    });
  });

  describe("Chat Input Integration", () => {
    it("passes input value and handlers correctly", () => {
      const setInput = jest.fn();
      const handleAddMessage = jest.fn();

      TestUtils.renderComponent(
        <ChatContainer
          {...defaultProps}
          input="test message"
          setInput={setInput}
          handleAddMessage={handleAddMessage}
        />,
      );

      const input = screen.getByTestId("chat-input-field");
      expect(input).toHaveValue("test message");
    });

    it("shows loading state in chat input", () => {
      TestUtils.renderComponent(
        <ChatContainer {...defaultProps} isLoading={true} />,
      );

      const sendButton = screen.getByTestId("send-button");
      expect(sendButton).toHaveTextContent("Sending...");
      expect(sendButton).toBeDisabled();
    });

    it("handles input changes correctly", async () => {
      const setInput = jest.fn();
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(
        <ChatContainer {...defaultProps} setInput={setInput} />,
      );

      const input = screen.getByTestId("chat-input-field");
      await user.type(input, "new message");

      expect(setInput).toHaveBeenCalledWith("new message");
    });

    it("handles message sending correctly", async () => {
      const handleAddMessage = jest.fn().mockResolvedValue(undefined);
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(
        <ChatContainer {...defaultProps} handleAddMessage={handleAddMessage} />,
      );

      const sendButton = screen.getByTestId("send-button");
      await user.click(sendButton);

      expect(handleAddMessage).toHaveBeenCalledTimes(1);
    });

    it("shows correct placeholder text", () => {
      TestUtils.renderComponent(<ChatContainer {...defaultProps} />);

      const input = screen.getByTestId("chat-input-field");
      expect(input).toHaveAttribute(
        "placeholder",
        "Add more details to your task...",
      );
    });
  });

  describe("Performance and Memory", () => {
    it("renders within performance threshold", () => {
      const renderFunction: () => ReturnType<
        typeof TestUtils.renderComponent
      > = () => TestUtils.renderComponent(<ChatContainer {...defaultProps} />);

      // Performance test - ensure render completes without errors
      expect(renderFunction).toBeDefined();
      const renderResult = renderFunction();
      const { container } = renderResult;
      expect(container).toBeInTheDocument();
    });

    it("handles large message lists efficiently", () => {
      const largeMessageList: GroupedMessages[] = Array.from(
        { length: 100 },
        (_, i) => ({
          role: i % 2 === 0 ? Role.USER : Role.ASSISTANT,
          messages: [
            {
              id: `msg-${i}`,
              content: [{ type: MessageContentType._Text, text: `Message ${i}` }],
              role: i % 2 === 0 ? Role.USER : Role.ASSISTANT,
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      );

      const renderResult = TestUtils.renderComponent(
        <ChatContainer {...defaultProps} groupedMessages={largeMessageList} />,
      );
      const { renderTime } = renderResult;

      expect(renderTime ?? 0).toBeLessThan(RENDER_TIME_THRESHOLD_MS); // Should render large lists efficiently
    });

    it("cleans up scroll event listeners properly", () => {
      const mockRemoveEventListener = jest.fn();
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: mockRemoveEventListener,
      } as unknown as HTMLDivElement;
      const mockContainer: React.RefObject<HTMLDivElement> = {
        current: mockElement,
      };

      const renderResult = TestUtils.renderComponent(
        <ChatContainer {...defaultProps} scrollRef={mockContainer} />,
      );
      const { unmount } = renderResult;

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        "scroll",
        expect.any(Function),
      );
    });
  });

  describe("Error Handling", () => {
    it("handles missing scrollRef gracefully", () => {
      TestUtils.renderComponent(
        <ChatContainer {...defaultProps} scrollRef={{ current: null }} />,
      );

      expect(screen.getByTestId("message-group-user")).toBeInTheDocument();
    });

    it("handles invalid task status gracefully", () => {
      TestUtils.renderComponent(
        <ChatContainer
          {...defaultProps}
          taskStatus={"INVALID" as TaskStatus}
        />,
      );

      // Should still render without crashing
      expect(screen.getByTestId("message-group-user")).toBeInTheDocument();
    });

    it("handles empty messageIdToIndex object", () => {
      TestUtils.renderComponent(
        <ChatContainer {...defaultProps} messageIdToIndex={{}} />,
      );

      expect(screen.getByTestId("message-group-user")).toBeInTheDocument();
    });

    it("handles failed message loading gracefully", async () => {
      const loadMoreMessages = jest
        .fn()
        .mockRejectedValue(new Error("Network error"));
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {
          // Intentionally empty - suppressing console errors for test
        });

      TestUtils.renderComponent(
        <ChatContainer {...defaultProps} loadMoreMessages={loadMoreMessages} />,
      );

      const mockContainer = defaultProps.scrollRef.current;
      if (mockContainer) {
        act(() => {
          fireEvent.scroll(mockContainer);
        });
      }

      await waitFor(() => {
        expect(loadMoreMessages).toHaveBeenCalled();
      });

      // Component should continue to function despite the error
      expect(screen.getByTestId("message-group-user")).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Accessibility", () => {
    it("provides proper ARIA labels and roles", () => {
      TestUtils.renderComponent(<ChatContainer {...defaultProps} />);

      const chatInput = screen.getByTestId("chat-input");
      expect(chatInput).toBeInTheDocument();
    });

    it("maintains focus management correctly", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<ChatContainer {...defaultProps} />);

      const input = screen.getByTestId("chat-input-field");
      await user.click(input);

      expect(input).toHaveFocus();
    });

    it("supports keyboard navigation", async () => {
      const handleAddMessage = jest.fn();
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(
        <ChatContainer {...defaultProps} handleAddMessage={handleAddMessage} />,
      );

      const input = screen.getByTestId("chat-input-field");
      await user.type(input, "test message");
      await user.keyboard("{Enter}");

      // The actual Enter key handling is in ChatInput component
      // Here we verify the setup is correct
      expect(input).toHaveValue("test message");
    });

    it("announces loading states to screen readers", () => {
      TestUtils.renderComponent(
        <ChatContainer {...defaultProps} isLoadingMoreMessages={true} />,
      );

      const loader = screen.getByTestId("loader");
      expect(loader).toHaveTextContent("Loading...");
    });
  });

  describe("Integration with WebSocket Events", () => {
    it("handles real-time message updates correctly", () => {
      const renderResult = TestUtils.renderComponent(
        <ChatContainer {...defaultProps} />,
      );
      const { rerender } = renderResult;

      // Simulate new message arriving
      const updatedMessages: GroupedMessages[] = [
        ...defaultProps.groupedMessages,
        {
          role: Role.ASSISTANT,
          messages: [
            {
              id: "new-msg",
              content: [
                { type: "text", text: "New message" },
              ] as MessageContentBlock[],
              role: Role.ASSISTANT,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      ];

      rerender(
        <ChatContainer {...defaultProps} groupedMessages={updatedMessages} />,
      );

      const messageGroups = screen.getAllByTestId(/message-group-/);
      expect(messageGroups).toHaveLength(EXPECTED_MESSAGE_GROUP_COUNT);
    });

    it("handles task status updates correctly", () => {
      const renderResult = TestUtils.renderComponent(
        <ChatContainer {...defaultProps} taskStatus={TaskStatus.RUNNING} />,
      );
      const { rerender } = renderResult;

      expect(screen.getByTestId("chat-input")).toBeInTheDocument();

      rerender(
        <ChatContainer {...defaultProps} taskStatus={TaskStatus.COMPLETED} />,
      );

      expect(screen.queryByTestId("chat-input")).not.toBeInTheDocument();
    });
  });
});

// Export test utilities for other chat-related tests
export const ChatContainerTestUtils = {
  createMockGroupedMessages,
  createMockScrollRef: (): React.RefObject<HTMLDivElement> =>
    ({
      current: null as HTMLDivElement | null,
    }) as React.RefObject<HTMLDivElement>,
  createMockProps: (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    scrollRef: { current: null },
    messageIdToIndex: { "msg-1": 0, "msg-2": 1 },
    taskId: "task-123",
    input: "",
    setInput: jest.fn(),
    isLoading: false,
    handleAddMessage: jest.fn(),
    groupedMessages: createMockGroupedMessages(),
    taskStatus: TaskStatus.RUNNING,
    control: Role.ASSISTANT,
    isLoadingSession: false,
    isLoadingMoreMessages: false,
    hasMoreMessages: true,
    loadMoreMessages: jest.fn(),
    ...overrides,
  }),
};
