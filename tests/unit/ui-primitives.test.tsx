import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Avatar } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { WaterDivider } from "@/components/ui/water-divider";

describe("Button", () => {
  it("renders without crashing with default props", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("renders as a button element by default", () => {
    render(<Button>Go</Button>);
    const btn = screen.getByRole("button", { name: "Go" });
    expect(btn.tagName).toBe("BUTTON");
  });

  it("applies a custom className", () => {
    render(<Button className="custom-class">X</Button>);
    const btn = screen.getByRole("button", { name: "X" });
    expect(btn.className).toContain("custom-class");
  });

  it("respects the disabled prop", () => {
    render(<Button disabled>Off</Button>);
    const btn = screen.getByRole("button", { name: "Off" });
    expect(btn).toBeDisabled();
  });

  it("renders with the primary variant class", () => {
    render(<Button variant="primary">Primary</Button>);
    const btn = screen.getByRole("button", { name: "Primary" });
    expect(btn.className).toContain("bg-brand-blue");
  });
});

describe("Input", () => {
  it("renders with placeholder", () => {
    render(<Input placeholder="Search..." />);
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("forwards the value prop", () => {
    render(<Input value="hello" onChange={() => {}} />);
    const input = screen.getByDisplayValue("hello") as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it("forwards the name prop", () => {
    render(<Input name="email" placeholder="e" />);
    const input = screen.getByPlaceholderText("e");
    expect(input).toHaveAttribute("name", "email");
  });

  it("respects the type prop", () => {
    render(<Input type="email" placeholder="e" />);
    const input = screen.getByPlaceholderText("e");
    expect(input).toHaveAttribute("type", "email");
  });
});

describe("Avatar", () => {
  it("renders initials from a single-word name", () => {
    render(<Avatar name="Ana" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders initials from a multi-word name (up to 2)", () => {
    render(<Avatar name="Ana Garcia Lopez" />);
    expect(screen.getByText("AG")).toBeInTheDocument();
  });

  it("uses '?' when name is empty", () => {
    render(<Avatar name="" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("uppercases the first letter of each word", () => {
    render(<Avatar name="juan perez" />);
    expect(screen.getByText("JP")).toBeInTheDocument();
  });

  it("renders an Image element when src is provided", () => {
    render(<Avatar name="Ana" src="https://example.com/avatar.png" />);
    const img = screen.getByRole("img", { name: "Ana" });
    expect(img).toBeInTheDocument();
  });
});

describe("Select", () => {
  it("renders with options", () => {
    render(
      <Select defaultValue="a">
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "A" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "B" })).toBeInTheDocument();
  });

  it("forwards the name prop", () => {
    render(
      <Select name="team">
        <option value="1">One</option>
      </Select>,
    );
    const select = screen.getByRole("combobox");
    expect(select).toHaveAttribute("name", "team");
  });
});

describe("Alert", () => {
  it("renders with title and children", () => {
    render(
      <Alert title="Heads up">
        Something important happened.
      </Alert>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Heads up")).toBeInTheDocument();
    expect(screen.getByText("Something important happened.")).toBeInTheDocument();
  });

  it("renders without a title", () => {
    render(<Alert>Just a body</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Just a body")).toBeInTheDocument();
  });

  it("applies the danger variant class", () => {
    render(<Alert variant="danger">Danger</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("border-danger");
  });
});

describe("WaterDivider", () => {
  it("renders an SVG with the expected layout class", () => {
    const { container } = render(<WaterDivider />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.className).toContain("relative w-full");
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 1440 80");
  });

  it("applies a custom className", () => {
    const { container } = render(<WaterDivider className="my-class" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("my-class");
  });

  it("respects the custom height", () => {
    const { container } = render(<WaterDivider height={80} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.height).toBe("80px");
  });
});
