import { Cocktail } from "../Definitions/RandomCocktail";

export interface Recipe {
  id: string;
  name: string;
  spirit: string;
  note: string;
  image: string;
  ingredients: string[];
  instructions: string;
  time?: string;
  difficulty?: "Easy" | "Medium";
  tags: string[];
  complete: boolean;
}

export const recipes: Recipe[] = [
  {
    id: "golden-hour",
    name: "Golden Hour",
    spirit: "Bourbon",
    note: "Citrus · Honey · Bitters",
    image:
      "https://images.unsplash.com/photo-1598994671512-395d7a6147e0?auto=format&fit=crop&w=1200&q=85",
    ingredients: [
      "2 oz bourbon",
      "¾ oz lemon juice",
      "½ oz honey syrup",
      "2 dashes aromatic bitters",
    ],
    instructions:
      "Shake with ice until chilled. Strain over a large cube and finish with a lemon twist.",
    time: "5 min",
    difficulty: "Easy",
    tags: ["citrus", "happy hour"],
    complete: true,
  },
  {
    id: "ruby-collins",
    name: "Ruby Collins",
    spirit: "Gin",
    note: "Berry · Lemon · Soda",
    image:
      "https://images.unsplash.com/photo-1605270012917-bf157c5a9541?auto=format&fit=crop&w=900&q=85",
    ingredients: [
      "2 oz dry gin",
      "¾ oz lemon juice",
      "½ oz raspberry syrup",
      "Club soda",
    ],
    instructions:
      "Shake the first three ingredients with ice. Pour into a tall glass and top with soda.",
    time: "6 min",
    difficulty: "Easy",
    tags: ["brunch", "citrus", "refreshing"],
    complete: true,
  },
  {
    id: "apricot-spritz",
    name: "Apricot Spritz",
    spirit: "Aperitivo",
    note: "Stone fruit · Bubbles · Orange",
    image:
      "https://images.unsplash.com/photo-1597403491447-3ab08f8e44dc?auto=format&fit=crop&w=900&q=85",
    ingredients: [
      "1½ oz aperitivo",
      "1 oz apricot nectar",
      "3 oz sparkling wine",
      "Splash of soda",
    ],
    instructions:
      "Build in a wine glass over ice. Stir gently and garnish with a thin orange wheel.",
    time: "4 min",
    difficulty: "Easy",
    tags: ["brunch", "citrus", "sparkling"],
    complete: true,
  },
  {
    id: "velvet-espresso",
    name: "Velvet Espresso",
    spirit: "Vodka",
    note: "Coffee · Cacao · Vanilla",
    image:
      "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=85",
    ingredients: [
      "1½ oz vodka",
      "1 oz fresh espresso",
      "¾ oz coffee liqueur",
      "¼ oz vanilla syrup",
    ],
    instructions:
      "Shake hard with ice for a silky foam. Double strain into a chilled coupe.",
    time: "7 min",
    difficulty: "Medium",
    tags: ["coffee", "after dinner"],
    complete: true,
  },
  {
    id: "garden-gimlet",
    name: "Garden Gimlet",
    spirit: "Gin",
    note: "Basil · Lime · Cucumber",
    image:
      "https://images.unsplash.com/photo-1598994392980-53a7fb033bcc?auto=format&fit=crop&w=900&q=85",
    ingredients: [
      "2 oz botanical gin",
      "¾ oz lime juice",
      "½ oz simple syrup",
      "Cucumber and basil",
    ],
    instructions:
      "Muddle cucumber and basil lightly. Add remaining ingredients, shake, and fine strain.",
    time: "8 min",
    difficulty: "Medium",
    tags: ["citrus", "herbal"],
    complete: true,
  },
  {
    id: "night-market",
    name: "Night Market",
    spirit: "Rum",
    note: "Pineapple · Lime · Spice",
    image:
      "https://images.unsplash.com/photo-1695605302696-b82d19ce57cf?auto=format&fit=crop&w=900&q=85",
    ingredients: [
      "2 oz aged rum",
      "1 oz pineapple juice",
      "½ oz lime juice",
      "¼ oz spiced syrup",
    ],
    instructions:
      "Shake with plenty of ice. Strain over crushed ice and garnish with fresh mint.",
    time: "6 min",
    difficulty: "Easy",
    tags: ["citrus", "tropical"],
    complete: true,
  },
];

export function fromCocktail(drink: Cocktail): Recipe {
  const ingredients: string[] = [];
  for (let index = 1; index <= 15; index++) {
    const ingredient = drink[("strIngredient" + index) as keyof Cocktail];
    const measure = drink[("strMeasure" + index) as keyof Cocktail];
    if (ingredient)
      ingredients.push(
        [measure && measure.trim(), ingredient].filter(Boolean).join(" ")
      );
  }
  return {
    id: drink.idDrink,
    name: drink.strDrink,
    image: drink.strDrinkThumb,
    spirit: drink.strIngredient1 || "Cocktail",
    note: ingredients.length
      ? ingredients.slice(0, 3).join(" · ")
      : "From TheCocktailDB collection",
    ingredients,
    instructions: drink.strInstructions || "",
    tags: (drink.strTags || "").split(",").filter(Boolean),
    complete: Boolean(drink.strInstructions),
  };
}

export function readStored<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || fallback;
  } catch {
    return fallback;
  }
}

export function readCollection(key: string): Recipe[] {
  const value = readStored<unknown>(key, []);
  return Array.isArray(value)
    ? value.filter(
        (item): item is Recipe =>
          item &&
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          typeof item.image === "string" &&
          typeof item.spirit === "string" &&
          typeof item.note === "string" &&
          typeof item.instructions === "string" &&
          Array.isArray(item.ingredients) &&
          item.ingredients.every((part: unknown) => typeof part === "string") &&
          Array.isArray(item.tags) &&
          item.tags.every((part: unknown) => typeof part === "string")
      )
    : [];
}

export function persist(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Keep the app usable when browser storage is unavailable. */
  }
}
