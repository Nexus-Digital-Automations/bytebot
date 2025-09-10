/**
 * Header Component Tests - Comprehensive Navigation and Layout Testing
 *
 * Tests cover:
 * - Header layout and responsive behavior
 * - Navigation functionality and routing
 * - User authentication state handling
 * - Theme switching and preferences
 * - Accessibility for navigation elements
 * - Mobile menu behavior and interactions
 * - Search functionality and keyboard shortcuts
 *
 * @author Claude Code - Frontend Testing Specialist
 * @version 1.0.0
 */

import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { Header } from "../Header";
import { TestUtils } from "@/test-utils/setupAfterEnv";
// Import types only - actual functions are mocked below
// import { useSession, signOut } from "next-auth/react";

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: "/",
  query: {},
  asPath: "/",
  route: "/",
  isReady: true,
};

jest.mock("next/router", () => ({
  useRouter: () => mockRouter,
}));

// Mock theme provider
const mockTheme = {
  theme: "light",
  setTheme: jest.fn(),
  systemTheme: "light",
};

jest.mock("next-themes", () => ({
  useTheme: () => mockTheme,
}));

// Mock UI components
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    icon,
    ...props
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
    icon?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      data-testid="button"
      {...props}
    >
      {icon && <span data-testid="button-icon">{icon}</span>}
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <div data-testid="dropdown-item" onClick={onClick}>
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  DropdownMenuSeparator: () => <div data-testid="dropdown-separator" />,
}));

jest.mock("@/components/ui/input", () => ({
  Input: ({
    onChange,
    placeholder,
    onKeyDown,
    ...props
  }: {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    onKeyDown?: (event: React.KeyboardEvent) => void;
    [key: string]: unknown;
  }) => (
    <input
      value={props.value}
      onChange={(e) => onChange?.(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      data-testid="search-input"
      {...props}
    />
  ),
}));

// Mock icons
jest.mock("lucide-react", () => ({
  Menu: () => <span data-testid="menu-icon">Menu</span>,
  X: () => <span data-testid="close-icon">Close</span>,
  Search: () => <span data-testid="search-icon">Search</span>,
  Sun: () => <span data-testid="sun-icon">Sun</span>,
  Moon: () => <span data-testid="moon-icon">Moon</span>,
  User: () => <span data-testid="user-icon">User</span>,
  Settings: () => <span data-testid="settings-icon">Settings</span>,
  LogOut: () => <span data-testid="logout-icon">LogOut</span>,
}));

// Mock session
const mockSession = {
  user: {
    id: "user-123",
    name: "Test User",
    email: "test@example.com",
    image: "/test-avatar.png",
  },
  expires: "2024-01-01T00:00:00.000Z",
};

const ___mockUseSession = jest.fn();
const _mockSignOut = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: ___mockUseSession,
  signOut: _mockSignOut,
}));

// Set default mock implementation
___mockUseSession.mockReturnValue({
  data: mockSession,
  status: "authenticated",
});

describe("Header Component", () => {
  const defaultProps = {
    title: "Bytebot UI",
    showSearch: true,
    onSearch: jest.fn(),
    searchQuery: "",
    searchPlaceholder: "Search tasks...",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.push.mockClear();
    mockTheme.setTheme.mockClear();
  });

  describe("Basic Rendering", () => {
    it("renders header correctly", () => {
      TestUtils.renderComponent(<Header />);

      expect(screen.getByText("Bytebot UI")).toBeInTheDocument();
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    it("applies correct CSS classes", () => {
      const { container } = TestUtils.renderComponent(<Header />);

      const header = container.querySelector("header");
      expect(header).toHaveClass("header", "sticky", "top-0");
    });

    it("renders with custom title", () => {
      TestUtils.renderComponent(<Header />);

      expect(screen.getByText("Custom Title")).toBeInTheDocument();
    });

    it("renders without title when not provided", () => {
      const { ...propsWithoutTitle } = defaultProps;
      TestUtils.renderComponent(<Header />);

      expect(screen.queryByText("Bytebot UI")).not.toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    it("renders search input when showSearch is true", () => {
      TestUtils.renderComponent(<Header />);

      expect(screen.getByTestId("search-input")).toBeInTheDocument();
      expect(screen.getByTestId("search-icon")).toBeInTheDocument();
    });

    it("hides search input when showSearch is false", () => {
      TestUtils.renderComponent(<Header />);

      expect(screen.queryByTestId("search-input")).not.toBeInTheDocument();
    });

    it("displays search query correctly", () => {
      TestUtils.renderComponent(<Header />);

      const searchInput = screen.getByTestId("search-input");
      expect(searchInput).toHaveValue("test query");
    });

    it("calls onSearch when typing in search input", async () => {
      const onSearch = jest.fn();
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<Header />);

      const searchInput = screen.getByTestId("search-input");
      await user.type(searchInput, "test");

      expect(onSearch).toHaveBeenCalledWith("test");
    });

    it("handles search keyboard shortcuts", async () => {
      const onSearch = jest.fn();
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<Header />);

      // Test Ctrl+K to focus search
      await user.keyboard("{Control>}k{/Control}");

      const searchInput = screen.getByTestId("search-input");
      expect(searchInput).toHaveFocus();
    });

    it("handles Enter key in search input", async () => {
      const onSearch = jest.fn();
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(
        <Header
          {...defaultProps}
          onSearch={onSearch}
          searchQuery="test query"
        />,
      );

      const searchInput = screen.getByTestId("search-input");
      await user.type(searchInput, "{Enter}");

      // Should trigger search action or navigation
      expect(onSearch).toHaveBeenCalled();
    });

    it("displays custom search placeholder", () => {
      TestUtils.renderComponent(<Header />);

      const searchInput = screen.getByTestId("search-input");
      expect(searchInput).toHaveAttribute("placeholder", "Find anything...");
    });

    it("clears search when escape is pressed", async () => {
      const onSearch = jest.fn();
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<Header />);

      const searchInput = screen.getByTestId("search-input");
      await user.type(searchInput, "{Escape}");

      expect(onSearch).toHaveBeenCalledWith("");
    });
  });

  describe("Navigation", () => {
    it("renders navigation links", () => {
      TestUtils.renderComponent(<Header />);

      expect(screen.getByText("Tasks")).toBeInTheDocument();
      expect(screen.getByText("Desktop")).toBeInTheDocument();
    });

    it("navigates to tasks page when clicked", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<Header />);

      const tasksLink = screen.getByText("Tasks");
      await user.click(tasksLink);

      expect(mockRouter.push).toHaveBeenCalledWith("/tasks");
    });

    it("navigates to desktop page when clicked", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<Header />);

      const desktopLink = screen.getByText("Desktop");
      await user.click(desktopLink);

      expect(mockRouter.push).toHaveBeenCalledWith("/desktop");
    });

    it("highlights active navigation item", () => {
      mockRouter.pathname = "/tasks";

      TestUtils.renderComponent(<Header />);

      const tasksLink = screen.getByText("Tasks");
      expect(tasksLink).toHaveClass("active");
    });

    it("supports keyboard navigation", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<Header />);

      await user.tab(); // Focus first nav item
      await user.keyboard("{Enter}");

      expect(mockRouter.push).toHaveBeenCalled();
    });
  });

  describe("Theme Switching", () => {
    it("renders theme toggle button", () => {
      TestUtils.renderComponent(<Header />);

      const themeButton = screen.getByTestId("button");
      expect(themeButton).toBeInTheDocument();
    });

    it("shows sun icon in light mode", () => {
      mockTheme.theme = "light";

      TestUtils.renderComponent(<Header />);

      expect(screen.getByTestId("sun-icon")).toBeInTheDocument();
    });

    it("shows moon icon in dark mode", () => {
      mockTheme.theme = "dark";

      TestUtils.renderComponent(<Header />);

      expect(screen.getByTestId("moon-icon")).toBeInTheDocument();
    });

    it("toggles theme when clicked", async () => {
      const user = TestUtils.createUserEvent();
      mockTheme.theme = "light";

      TestUtils.renderComponent(<Header />);

      const themeButton = screen.getByTestId("button");
      await user.click(themeButton);

      expect(mockTheme.setTheme).toHaveBeenCalledWith("dark");
    });

    it("handles system theme preference", () => {
      mockTheme.theme = "system";
      mockTheme.systemTheme = "dark";

      TestUtils.renderComponent(<Header />);

      // Should show appropriate icon based on system theme
      expect(screen.getByTestId("moon-icon")).toBeInTheDocument();
    });
  });

  describe("User Authentication", () => {
    it("shows user menu when authenticated", () => {
      TestUtils.renderComponent(<Header />);

      expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument();
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    it("shows user avatar when available", () => {
      TestUtils.renderComponent(<Header />);

      const avatar = screen.getByAltText("Test User");
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute("src", "/test-avatar.png");
    });

    it("shows default avatar when image not available", () => {
      const sessionWithoutImage = {
        ...mockSession,
        user: {
          ...mockSession.user,
          image: null,
        },
      };

      __mockUseSession.mockReturnValue({
        data: sessionWithoutImage,
        status: "authenticated",
      });

      TestUtils.renderComponent(<Header />);

      expect(screen.getByTestId("user-icon")).toBeInTheDocument();
    });

    it("opens user menu when clicked", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<Header />);

      const userButton = screen.getByTestId("dropdown-trigger");
      await user.click(userButton);

      expect(screen.getByTestId("dropdown-content")).toBeInTheDocument();
    });

    it("shows user menu options", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<Header />);

      const userButton = screen.getByTestId("dropdown-trigger");
      await user.click(userButton);

      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Sign Out")).toBeInTheDocument();
    });

    it("handles sign out", async () => {
      const user = TestUtils.createUserEvent();
      const signOutMock = _mockSignOut;

      TestUtils.renderComponent(<Header />);

      const userButton = screen.getByTestId("dropdown-trigger");
      await user.click(userButton);

      const signOutButton = screen.getByText("Sign Out");
      await user.click(signOutButton);

      expect(signOutMock).toHaveBeenCalled();
    });

    it("shows login button when not authenticated", () => {
      __mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
      });

      TestUtils.renderComponent(<Header />);

      expect(screen.getByText("Sign In")).toBeInTheDocument();
    });
  });

  describe("Mobile Menu", () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });
      window.dispatchEvent(new Event("resize"));
    });

    it("shows mobile menu button on small screens", () => {
      TestUtils.renderComponent(<Header />);

      expect(screen.getByTestId("menu-icon")).toBeInTheDocument();
    });

    it("opens mobile menu when clicked", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<Header />);

      const menuButton = screen.getByTestId("menu-icon");
      await user.click(menuButton);

      expect(screen.getByTestId("mobile-menu")).toBeInTheDocument();
    });

    it("closes mobile menu when close button clicked", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<Header />);

      // Open menu
      const menuButton = screen.getByTestId("menu-icon");
      await user.click(menuButton);

      // Close menu
      const closeButton = screen.getByTestId("close-icon");
      await user.click(closeButton);

      expect(screen.queryByTestId("mobile-menu")).not.toBeInTheDocument();
    });

    it("closes mobile menu when navigation item clicked", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<Header />);

      // Open menu
      const menuButton = screen.getByTestId("menu-icon");
      await user.click(menuButton);

      // Click navigation item
      const tasksLink = screen.getByText("Tasks");
      await user.click(tasksLink);

      expect(screen.queryByTestId("mobile-menu")).not.toBeInTheDocument();
    });

    it("closes mobile menu when clicking outside", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<Header />);

      // Open menu
      const menuButton = screen.getByTestId("menu-icon");
      await user.click(menuButton);

      expect(screen.getByTestId("mobile-menu")).toBeInTheDocument();

      // Click outside
      await user.click(document.body);

      await waitFor(() => {
        expect(screen.queryByTestId("mobile-menu")).not.toBeInTheDocument();
      });
    });

    it("supports keyboard navigation in mobile menu", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<Header />);

      // Open menu
      const menuButton = screen.getByTestId("menu-icon");
      await user.click(menuButton);

      // Navigate with keyboard
      await user.keyboard("{Tab}");
      await user.keyboard("{Enter}");

      expect(mockRouter.push).toHaveBeenCalled();
    });
  });

  describe("Responsive Behavior", () => {
    it("adapts layout for different screen sizes", () => {
      const breakpoints = ["mobile", "tablet", "desktop"];

      breakpoints.forEach((breakpoint) => {
        const { unmount } = TestUtils.testResponsive(<Header />, [
          breakpoint,
        ])[0];

        // Should render without errors across all breakpoints
        expect(screen.getByRole("banner")).toBeInTheDocument();

        unmount();
      });
    });

    it("hides/shows navigation elements based on screen size", () => {
      // Desktop view
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { rerender } = TestUtils.renderComponent(<Header />);

      expect(screen.queryByTestId("menu-icon")).not.toBeInTheDocument();
      expect(screen.getByText("Tasks")).toBeInTheDocument();

      // Mobile view
      Object.defineProperty(window, "innerWidth", {
        value: 375,
      });
      window.dispatchEvent(new Event("resize"));

      rerender(<Header />);

      expect(screen.getByTestId("menu-icon")).toBeInTheDocument();
    });

    it("adjusts search input width on mobile", () => {
      Object.defineProperty(window, "innerWidth", {
        value: 375,
      });

      TestUtils.renderComponent(<Header />);

      const searchInput = screen.getByTestId("search-input");
      expect(searchInput).toHaveClass("w-full");
    });
  });

  describe("Accessibility", () => {
    it("provides proper ARIA labels and roles", () => {
      TestUtils.renderComponent(<Header />);

      const header = screen.getByRole("banner");
      expect(header).toBeInTheDocument();

      const nav = screen.getByRole("navigation");
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute("aria-label", "Main navigation");
    });

    it("supports keyboard navigation", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<Header />);

      // Should be able to tab through all interactive elements
      await user.tab(); // Search input
      await user.tab(); // First nav link
      await user.tab(); // Second nav link
      await user.tab(); // Theme button
      await user.tab(); // User menu

      const userMenu = screen.getByTestId("dropdown-trigger");
      expect(userMenu).toHaveFocus();
    });

    it("announces theme changes to screen readers", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<Header />);

      const themeButton = screen.getByTestId("button");
      expect(themeButton).toHaveAttribute(
        "aria-label",
        expect.stringContaining("theme"),
      );

      await user.click(themeButton);

      // Should update aria-label to reflect new theme
      expect(themeButton).toHaveAttribute(
        "aria-label",
        expect.stringContaining("light"),
      );
    });

    it("provides skip links for navigation", () => {
      TestUtils.renderComponent(<Header />);

      const skipLink = screen.getByText("Skip to main content");
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveClass("sr-only", "focus:not-sr-only");
    });

    it("supports screen reader announcements for search", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<Header />);

      const searchInput = screen.getByTestId("search-input");
      expect(searchInput).toHaveAttribute(
        "aria-label",
        expect.stringContaining("search"),
      );

      await user.type(searchInput, "test");

      const searchResults = screen.getByLabelText(/search results/i);
      expect(searchResults).toBeInTheDocument();
    });
  });

  describe("Performance and Memory", () => {
    it("renders within performance threshold", () => {
      const renderFunction = () => TestUtils.renderComponent(<Header />);

      expect(renderFunction).toRenderWithinTime(50);
    });

    it("does not cause memory leaks on theme changes", () => {
      const initialMemory = process.memoryUsage();

      for (let i = 0; i < 100; i++) {
        const { unmount } = TestUtils.renderComponent(<Header />);
        unmount();
      }

      const finalMemory = process.memoryUsage();
      const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(memoryDelta).toBeLessThan(10 * 1024 * 1024);
    });

    it("efficiently handles rapid search input changes", async () => {
      const onSearch = jest.fn();
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<Header />);

      const searchInput = screen.getByTestId("search-input");

      // Rapid typing
      for (let i = 0; i < 10; i++) {
        await user.type(searchInput, `${i}`);
      }

      // Should not cause performance issues
      expect(onSearch).toHaveBeenCalledTimes(10);
    });
  });

  describe("Error Handling", () => {
    it("handles missing session data gracefully", () => {
      __mockUseSession.mockReturnValue({
        data: null,
        status: "loading",
      });

      TestUtils.renderComponent(<Header />);

      // Should render without crashing
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    it("handles theme provider errors gracefully", () => {
      mockTheme.setTheme.mockImplementation(() => {
        throw new Error("Theme error");
      });

      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      TestUtils.renderComponent(<Header />);

      // Should render without crashing
      expect(screen.getByRole("banner")).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it("handles navigation errors gracefully", async () => {
      mockRouter.push.mockRejectedValue(new Error("Navigation error"));
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<Header />);

      const tasksLink = screen.getByText("Tasks");
      await user.click(tasksLink);

      // Should not break the component
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });
  });
});

// Export test utilities for other header-related tests
export const HeaderTestUtils = {
  createMockSession: (
    overrides: { user?: Record<string, unknown>; [key: string]: unknown } = {},
  ) => ({
    user: {
      id: "test-user",
      name: "Test User",
      email: "test@example.com",
      image: "/test-avatar.png",
      ...overrides.user,
    },
    expires: "2024-01-01T00:00:00.000Z",
    ...overrides,
  }),

  mockMobileViewport: () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });
    window.dispatchEvent(new Event("resize"));
  },

  mockDesktopViewport: () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
    window.dispatchEvent(new Event("resize"));
  },

  verifyNavigationCall: (expectedPath: string) => {
    expect(mockRouter.push).toHaveBeenCalledWith(expectedPath);
  },

  verifyThemeChange: (expectedTheme: string) => {
    expect(mockTheme.setTheme).toHaveBeenCalledWith(expectedTheme);
  },
};
