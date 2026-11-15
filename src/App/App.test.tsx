import React from "react";
import { MemoryRouter } from "react-router-dom";
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/react";
import App from "./App";
import {
  getAllCocktails,
  getCocktailDetails,
  searchCocktails,
} from "../apiCalls";
import { mocked } from "ts-jest/utils";

jest.mock("../apiCalls");
const apiRecipe = {
  idDrink: "14622",
  strDrink: "Arctic Fish",
  strDrinkThumb: "https://example.com/fish.jpg",
  strIngredient1: "Vodka",
  strMeasure1: "2 oz",
  strIngredient3: "Orange juice",
  strMeasure3: "1 oz",
  strInstructions: "Shake with ice and serve well chilled.",
};
const showApp = async (path = "/") => {
  const app = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
  await act(async () => {
    await Promise.resolve();
  });
  return app;
};

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  window.scrollTo = jest.fn();
  mocked(getAllCocktails).mockResolvedValue([]);
  mocked(getCocktailDetails).mockResolvedValue(apiRecipe);
  mocked(searchCocktails).mockResolvedValue([]);
});

afterEach(async () => {
  await act(async () => {
    await Promise.resolve();
  });
  cleanup();
});

it("opens on the redesigned home and searches featured recipes by ingredient", async () => {
  const app = await showApp();
  expect(
    app.getByRole("heading", { name: /A better drink is/ })
  ).toBeInTheDocument();
  fireEvent.change(app.getByLabelText("Search cocktails or ingredients"), {
    target: { value: "honey" },
  });
  fireEvent.click(app.getByLabelText("Find a drink"));
  expect(await app.findByText("1 match")).toBeInTheDocument();
  expect(
    app.getByRole("button", { name: "Golden Hour", exact: true })
  ).toBeInTheDocument();
  expect(
    app.queryByRole("button", { name: "Ruby Collins", exact: true })
  ).not.toBeInTheDocument();
});

it("browses the full catalogue and paginates without dropping recipes", async () => {
  mocked(getAllCocktails).mockResolvedValue([apiRecipe]);
  const app = await showApp("/cocktails");
  await waitFor(() => expect(app.getByText("1 / 3")).toBeInTheDocument());
  fireEvent.click(app.getByLabelText("Next recipes"));
  expect(
    app.getByRole("button", { name: "Night Market", exact: true })
  ).toBeInTheDocument();
  fireEvent.click(app.getByLabelText("Next recipes"));
  expect(
    app.getByRole("button", { name: "Arctic Fish", exact: true })
  ).toBeInTheDocument();
  fireEvent.click(app.getByLabelText("Previous recipes"));
  expect(
    app.getByRole("button", { name: "Night Market", exact: true })
  ).toBeInTheDocument();
});

it("includes ingredient API matches and removes duplicate results", async () => {
  mocked(getAllCocktails).mockResolvedValue([apiRecipe]);
  mocked(searchCocktails).mockResolvedValue([apiRecipe]);
  const app = await showApp("/results?q=vodka");
  await waitFor(() => expect(searchCocktails).toHaveBeenCalledWith("vodka"));
  expect(
    await app.findByRole("button", { name: "Arctic Fish", exact: true })
  ).toBeInTheDocument();
  expect(
    app.getAllByRole("button", { name: "Arctic Fish", exact: true })
  ).toHaveLength(1);
});

it("persists saved and made recipes through a reload and allows removing them", async () => {
  let app = await showApp();
  fireEvent.click(app.getByLabelText("Save Golden Hour"));
  fireEvent.click(app.getByRole("button", { name: /View recipe/ }));
  let dialog = within(app.getByRole("dialog"));
  fireEvent.click(dialog.getByRole("button", { name: "I made this" }));
  expect(
    dialog.getByRole("button", { name: /Logged as made/ })
  ).toHaveAttribute("aria-pressed", "true");
  app.unmount();
  app = await showApp("/my_cocktails/favorites");
  expect(
    app.getByRole("button", { name: "Golden Hour", exact: true })
  ).toBeInTheDocument();
  fireEvent.click(app.getByRole("button", { name: /Made 1/ }));
  fireEvent.click(app.getByLabelText("View Golden Hour"));
  dialog = within(app.getByRole("dialog"));
  fireEvent.click(dialog.getByRole("button", { name: /Logged as made/ }));
  fireEvent.click(dialog.getByLabelText("Close Golden Hour recipe"));
  fireEvent.click(app.getByRole("button", { name: /Made 0/ }));
  expect(
    app.getByRole("heading", { name: "Nothing made yet." })
  ).toBeInTheDocument();
  fireEvent.click(app.getByRole("button", { name: /Saved 1/ }));
  fireEvent.click(app.getByLabelText("Unsave Golden Hour"));
  expect(
    app.getByRole("heading", { name: "Your bar book is empty." })
  ).toBeInTheDocument();
});

it("supports direct recipe links and keeps ingredient measures paired", async () => {
  const app = await showApp("/cocktails/14622");
  const dialog = within(await app.findByRole("dialog"));
  expect(
    await dialog.findByRole("heading", { name: "Arctic Fish" })
  ).toBeInTheDocument();
  expect(dialog.getByText("2 oz Vodka")).toBeInTheDocument();
  expect(dialog.getByText("1 oz Orange juice")).toBeInTheDocument();
  expect(dialog.getByText(apiRecipe.strInstructions)).toBeInTheDocument();
  fireEvent.click(dialog.getByLabelText("Close Arctic Fish recipe"));
  expect(app.queryByRole("dialog")).not.toBeInTheDocument();
  expect(
    app.getByRole("heading", { name: "What are we drinking tonight?" })
  ).toBeInTheDocument();
});

it("keeps featured recipes usable when the catalogue fails and handles missing recipes", async () => {
  mocked(getAllCocktails).mockRejectedValue(new Error("Offline"));
  mocked(getCocktailDetails).mockRejectedValue(new Error("Missing recipe"));
  let app = await showApp("/cocktails");
  expect(await app.findByRole("status")).toHaveTextContent(
    "The full collection is unavailable"
  );
  expect(
    app.getByRole("button", { name: "Golden Hour", exact: true })
  ).toBeInTheDocument();
  app.unmount();
  app = await showApp("/cocktails/999");
  expect(
    await app.findByRole("heading", { name: "This recipe is unavailable." })
  ).toBeInTheDocument();
});

it("creates a local profile and restores focus when its dialog closes", async () => {
  const app = await showApp();
  const signIn = app.getByRole("button", { name: "Sign in" });
  signIn.focus();
  fireEvent.click(signIn);
  const dialog = within(app.getByRole("dialog"));
  fireEvent.change(dialog.getByLabelText("What should we call you?"), {
    target: { value: "Becca" },
  });
  fireEvent.change(dialog.getByLabelText("Email"), {
    target: { value: "becca@example.com" },
  });
  fireEvent.submit(
    dialog.getByRole("button", { name: /Create my bar book/ }).closest("form")!
  );
  expect(
    dialog.getByRole("heading", { name: /Good evening, Becca/ })
  ).toBeInTheDocument();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(app.queryByRole("dialog")).not.toBeInTheDocument();
  expect(app.getByRole("button", { name: "Account for Becca" })).toHaveFocus();
  expect(JSON.parse(localStorage.getItem("stir-user")!)).toBe("Becca");
  expect(localStorage.getItem("stir-user")).not.toContain("@example.com");
});

it("handles malformed stored collections and provides a clear empty search", async () => {
  localStorage.setItem("stir-saved-recipes", '[{"id":"bad"},null]');
  const app = await showApp("/cocktails?q=nonexistent");
  expect(
    await app.findByRole("heading", { name: "Nothing shaken up yet." })
  ).toBeInTheDocument();
  fireEvent.click(app.getByRole("button", { name: /See all recipes/ }));
  expect(app.getByRole("heading", { name: "All recipes" })).toBeInTheDocument();
});
