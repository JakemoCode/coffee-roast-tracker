import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Combobox } from "../Combobox";

const options = [
  { value: "ethiopia", label: "Ethiopia" },
  { value: "colombia", label: "Colombia" },
  { value: "kenya", label: "Kenya" },
  { value: "brazil", label: "Brazil" },
];

describe("Combobox", () => {
  const defaultProps = {
    options,
    value: "",
    onChange: vi.fn(),
  };

  it("renders with data-testid", () => {
    render(<Combobox {...defaultProps} />);
    expect(screen.getByTestId("combobox")).toBeInTheDocument();
  });

  it("renders input with combobox role", () => {
    render(<Combobox {...defaultProps} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows placeholder text", () => {
    render(<Combobox {...defaultProps} placeholder="Select origin" />);
    expect(screen.getByPlaceholderText("Select origin")).toBeInTheDocument();
  });

  it("opens dropdown on focus", async () => {
    const user = userEvent.setup();
    render(<Combobox {...defaultProps} />);

    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(4);
  });

  it("filters options as user types", async () => {
    const user = userEvent.setup();
    render(<Combobox {...defaultProps} />);

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "eth");

    const optionElements = screen.getAllByRole("option");
    expect(optionElements).toHaveLength(1);
    expect(optionElements[0]).toHaveTextContent("Ethiopia");
  });

  it("selects option on click", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Combobox {...defaultProps} onChange={handleChange} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("Kenya"));

    expect(handleChange).toHaveBeenCalledWith("kenya");
  });

  it("closes dropdown after selection", async () => {
    const user = userEvent.setup();
    render(<Combobox {...defaultProps} />);

    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.click(screen.getByText("Brazil"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("navigates options with arrow keys", async () => {
    const user = userEvent.setup();
    render(<Combobox {...defaultProps} />);

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");

    // Second option should be active
    expect(input).toHaveAttribute("aria-activedescendant");
  });

  it("selects with Enter key", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Combobox {...defaultProps} onChange={handleChange} />);

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(handleChange).toHaveBeenCalledWith("ethiopia");
  });

  it("closes with Escape key", async () => {
    const user = userEvent.setup();
    render(<Combobox {...defaultProps} />);

    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("sets aria-expanded correctly", async () => {
    const user = userEvent.setup();
    render(<Combobox {...defaultProps} />);

    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-expanded", "false");

    await user.click(input);
    expect(input).toHaveAttribute("aria-expanded", "true");
  });

  it("closes dropdown on click outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Combobox {...defaultProps} />
        <button>Outside</button>
      </div>,
    );

    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.click(screen.getByText("Outside"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("allows custom values when allowCustom is true", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Combobox {...defaultProps} onChange={handleChange} allowCustom />);

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "Custom Origin");

    // allowCustom calls onChange on every keystroke
    expect(handleChange).toHaveBeenCalled();
    const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1];
    expect(lastCall?.[0]).toContain("Custom Origin");
  });

  it("displays selected value from options", () => {
    render(<Combobox {...defaultProps} value="colombia" />);
    expect(screen.getByRole("combobox")).toHaveValue("Colombia");
  });
});
