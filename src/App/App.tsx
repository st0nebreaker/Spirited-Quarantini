import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  getAllCocktails,
  getCocktailDetails,
  searchCocktails,
} from "../apiCalls";
import { Dialog, Icon, RecipeCard } from "./UI";
import {
  fromCocktail,
  persist,
  readCollection,
  readStored,
  Recipe,
  recipes,
} from "./recipes";
import "./Redesign.css";

// Retained for the API and legacy components that consume catalogue summaries.
export interface AllCocktailsDetails {
  strDrink: string;
  strDrinkThumb: string;
  idDrink: string;
}
const popularTerms = ["Gin", "Bourbon", "Citrus", "Easy", "Brunch"];
const weeklyRecipe = recipes[0];
const matches = (recipe: Recipe, query: string) =>
  query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .every((term) =>
      [
        recipe.name,
        recipe.spirit,
        recipe.note,
        recipe.difficulty || "",
        ...recipe.tags,
        ...recipe.ingredients,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );

export default function App() {
  const history = useHistory();
  const location = useLocation<{ background?: string }>();
  const detailId = /^\/cocktails\/([^/]+)$/.exec(location.pathname);
  const background = detailId && location.state && location.state.background;
  const pagePath = background ? background.split("?")[0] : location.pathname;
  const isLibrary = pagePath.indexOf("/my_cocktails") === 0;
  const isSearch = pagePath === "/cocktails" || pagePath === "/results";
  const isAbout = pagePath === "/about";
  const view = isLibrary
    ? "saved"
    : isSearch
    ? "search"
    : isAbout
    ? "about"
    : "browse";
  const query =
    new URLSearchParams(
      background ? background.split("?")[1] || "" : location.search
    ).get("q") || "";
  const [homeQuery, setHomeQuery] = useState("");
  const [catalogue, setCatalogue] = useState<Recipe[]>(recipes);
  const [remoteResults, setRemoteResults] = useState<Recipe[]>([]);
  const [catalogueError, setCatalogueError] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [detailError, setDetailError] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchPage, setSearchPage] = useState(0);
  const [user, setUser] = useState(() => {
    const value = readStored<unknown>("stir-user", "");
    return typeof value === "string" ? value : "";
  });
  const [saved, setSaved] = useState<Recipe[]>(() =>
    readCollection("stir-saved-recipes")
  );
  const [logged, setLogged] = useState<Recipe[]>(() =>
    readCollection("stir-made-recipes")
  );
  const libraryTab = pagePath.endsWith("/logged") ? "made" : "saved";
  useEffect(() => persist("stir-saved-recipes", saved), [saved]);
  useEffect(() => persist("stir-made-recipes", logged), [logged]);
  useEffect(() => persist("stir-user", user), [user]);
  useEffect(() => {
    let active = true;
    getAllCocktails()
      .then((drinks) => {
        if (active)
          setCatalogue([
            ...recipes,
            ...drinks
              .filter((drink) => drink.idDrink && drink.strDrink)
              .map(fromCocktail),
          ]);
      })
      .catch(() => {
        if (active) setCatalogueError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setSearchPage(0);
    setRemoteResults([]);
    setSearchError(false);
    if (!query.trim() || !isSearch) {
      setSearching(false);
      return;
    }
    setSearching(true);
    const timeout = window.setTimeout(() => {
      searchCocktails(query.trim())
        .then((drinks) => {
          if (active) setRemoteResults(drinks.map(fromCocktail));
        })
        .catch(() => {
          if (active) setSearchError(true);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [query, isSearch]);
  const id = detailId ? detailId[1] : "";
  useEffect(() => {
    let active = true;
    setDetailError(false);
    if (!id) {
      setSelected(null);
      return;
    }
    const known = [...recipes, ...saved, ...logged].find(
      (recipe) => recipe.id === id && recipe.complete
    );
    if (known) {
      setSelected(known);
      return;
    }
    setSelected(null);
    getCocktailDetails(id)
      .then((drink) => {
        if (!drink || !drink.idDrink) throw new Error("Recipe unavailable");
        if (active) setSelected(fromCocktail(drink));
      })
      .catch(() => {
        if (active) setDetailError(true);
      });
    return () => {
      active = false;
    };
  }, [id, saved, logged]);
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);
  const results = useMemo(() => {
    const all = [
      ...catalogue.filter((recipe) => matches(recipe, query)),
      ...remoteResults,
    ];
    return all.filter(
      (recipe, index) =>
        all.findIndex((item) => item.id === recipe.id) === index
    );
  }, [catalogue, query, remoteResults]);
  const pageCount = Math.max(1, Math.ceil(results.length / 3));
  const currentPage = Math.min(searchPage, pageCount - 1);
  const visibleResults = results.slice(currentPage * 3, currentPage * 3 + 3);
  const libraryRecipes = libraryTab === "saved" ? saved : logged;
  const isSaved = (recipe: Recipe) =>
    saved.some((item) => item.id === recipe.id);
  const isMade = (recipe: Recipe) =>
    logged.some((item) => item.id === recipe.id);
  const navigate = (path: string) => {
    history.push(path);
    setMenuOpen(false);
    if (typeof window.scrollTo === "function") window.scrollTo(0, 0);
  };
  const search = (term: string, replace = false) => {
    const path = "/cocktails" + (term ? "?q=" + encodeURIComponent(term) : "");
    setSearchPage(0);
    replace ? history.replace(path) : navigate(path);
  };
  const openRecipe = (recipe: Recipe) => {
    history.push("/cocktails/" + recipe.id, {
      background: location.pathname + location.search,
    });
  };
  const closeRecipe = () => {
    history.replace(background || "/cocktails");
  };
  const toggleSaved = (recipe: Recipe) =>
    setSaved((items) =>
      items.some((item) => item.id === recipe.id)
        ? items.filter((item) => item.id !== recipe.id)
        : [...items, recipe]
    );
  const signIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUser(
      String(new FormData(event.currentTarget).get("name") || "").trim() ||
        "Guest"
    );
  };
  const renderCards = (items: Recipe[]) => (
    <div className="recipe-grid">
      {items.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          saved={isSaved(recipe)}
          onOpen={() => openRecipe(recipe)}
          onSave={() => toggleSaved(recipe)}
        />
      ))}
    </div>
  );
  return (
    <div className={`stir-app ${view === "browse" ? "is-home" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <button
          className="brand"
          onClick={() => navigate("/")}
          aria-label="Stir Crazy home"
        >
          Stir Crazy<span className="brand-star">✳</span>
        </button>
        <nav
          className={menuOpen ? "nav-open" : ""}
          aria-label="Main navigation"
          id="main-navigation"
        >
          {(
            [
              ["browse", "Home", "/"],
              ["search", "Find a drink", "/cocktails"],
              ["saved", "My recipes", "/my_cocktails"],
            ] as const
          ).map(([key, label, path]) => (
            <button
              key={key}
              className={view === key ? "active" : ""}
              aria-current={view === key ? "page" : undefined}
              onClick={() => navigate(path)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button mobile-search"
            onClick={() => search("")}
            aria-label="Search"
          >
            <Icon name="search" />
          </button>
          <button
            className="account-button"
            onClick={() => setAccountOpen(true)}
            aria-label={user ? `Account for ${user}` : "Sign in"}
          >
            <Icon name="user" size={18} />
            <span>{user || "Sign in"}</span>
          </button>
          <button
            className="menu-button icon-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
          >
            <Icon name="menu" />
          </button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {view === "browse" && (
          <section className="home-page" aria-label="Stir Crazy home">
            <div className="browse-bar">
              <span className="bar-label">Find your next pour</span>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  search(homeQuery);
                }}
              >
                <Icon name="search" size={19} />
                <input
                  aria-label="Search cocktails or ingredients"
                  value={homeQuery}
                  onChange={(event) => setHomeQuery(event.target.value)}
                  placeholder="A cocktail, spirit, or ingredient…"
                />
                <button type="submit" aria-label="Find a drink">
                  <Icon name="arrow" size={19} />
                </button>
              </form>
              <div className="browse-links">
                {["Gin", "Easy", "Brunch"].map((term) => (
                  <button key={term} onClick={() => search(term)}>
                    {term}
                  </button>
                ))}
                <button className="browse-all" onClick={() => search("")}>
                  Browse all <Icon name="arrow" size={15} />
                </button>
              </div>
            </div>
            <div className="home-hero">
              <div className="hero-copy">
                <p className="eyebrow">Recipes for the home bar</p>
                <h1>
                  A better drink is
                  <br />
                  closer than you think.
                </h1>
                <p className="hero-description">
                  Thoughtful recipes, clear instructions, and a little bar
                  wisdom—no velvet rope required.
                </p>
                <button className="primary-button" onClick={() => search("")}>
                  Browse every recipe <Icon name="arrow" size={18} />
                </button>
                <div className="hero-footnote">
                  <span className="little-rule" />
                  Mix. Shake. Stay a while.
                </div>
              </div>
              <article className="weekly-card">
                <img
                  className="weekly-image"
                  src={weeklyRecipe.image}
                  alt="Golden Hour, this week's featured cocktail"
                />
                <div className="weekly-shade" />
                <span className="weekly-label">
                  <span />
                  Cocktail of the week
                </span>
                <button
                  className="weekly-save icon-button"
                  aria-label={`${
                    isSaved(weeklyRecipe) ? "Unsave" : "Save"
                  } Golden Hour`}
                  aria-pressed={isSaved(weeklyRecipe)}
                  onClick={() => toggleSaved(weeklyRecipe)}
                >
                  <Icon name={isSaved(weeklyRecipe) ? "check" : "bookmark"} />
                </button>
                <div className="weekly-bottom">
                  <p className="eyebrow">Bourbon · 5 min · Easy</p>
                  <h2>Golden Hour</h2>
                  <p>{weeklyRecipe.note}</p>
                  <button
                    className="weekly-cta"
                    onClick={() => openRecipe(weeklyRecipe)}
                  >
                    View recipe <Icon name="arrow" size={20} />
                  </button>
                </div>
              </article>
            </div>
            <footer className="home-footer">
              <span>A good night starts with a good recipe.</span>
              <button onClick={() => navigate("/about")}>
                The home bar is open.
              </button>
            </footer>
          </section>
        )}
        {view === "search" && (
          <section className="content-page">
            <div className="page-intro">
              <p className="eyebrow">Recipe finder</p>
              <h1>What are we drinking tonight?</h1>
              <p className="muted">
                Search by cocktail, spirit, or whatever ingredient is calling
                your name.
              </p>
            </div>
            <label className="search-field">
              <Icon name="search" size={23} />
              <input
                autoFocus
                value={query}
                onChange={(event) => search(event.target.value, true)}
                placeholder="Try gin, easy, or brunch"
                aria-label="Search recipes"
              />
              {query && (
                <button
                  className="icon-button"
                  onClick={() => search("")}
                  aria-label="Clear search"
                >
                  <Icon name="close" size={18} />
                </button>
              )}
            </label>
            <div className="quick-searches">
              <button
                className={!query.trim() ? "browse-all active" : "browse-all"}
                aria-pressed={!query.trim()}
                onClick={() => search("")}
              >
                Browse all <Icon name="arrow" size={15} />
              </button>
              <span>Popular:</span>
              {popularTerms.map((term) => (
                <button
                  className={
                    query.toLowerCase() === term.toLowerCase() ? "active" : ""
                  }
                  aria-pressed={query.toLowerCase() === term.toLowerCase()}
                  key={term}
                  onClick={() => search(term)}
                >
                  {term}
                </button>
              ))}
            </div>
            {(catalogueError || searchError) && (
              <p className="status-note" role="status">
                The full collection is unavailable right now. You can still
                explore our featured recipes.
              </p>
            )}
            <div className="results-heading">
              <div aria-live="polite">
                <h2>
                  {query
                    ? `${results.length} ${
                        results.length === 1 ? "match" : "matches"
                      }`
                    : "All recipes"}
                </h2>
                {query && <span className="muted">for “{query}”</span>}
                {searching && (
                  <span className="muted">Searching the collection…</span>
                )}
              </div>
              {pageCount > 1 && (
                <div className="rail-controls">
                  <button
                    className="icon-button previous"
                    onClick={() =>
                      setSearchPage((currentPage - 1 + pageCount) % pageCount)
                    }
                    aria-label="Previous recipes"
                  >
                    <Icon name="arrow" />
                  </button>
                  <span>
                    {currentPage + 1} / {pageCount}
                  </span>
                  <button
                    className="icon-button"
                    onClick={() => setSearchPage((currentPage + 1) % pageCount)}
                    aria-label="Next recipes"
                  >
                    <Icon name="arrow" />
                  </button>
                </div>
              )}
            </div>
            {results.length ? (
              renderCards(visibleResults)
            ) : (
              <div className="empty-state">
                <h2>
                  {searching
                    ? "Looking for your next pour…"
                    : "Nothing shaken up yet."}
                </h2>
                <p>Try another ingredient, spirit, or occasion.</p>
                <button className="secondary-button" onClick={() => search("")}>
                  See all recipes <Icon name="arrow" />
                </button>
              </div>
            )}
          </section>
        )}
        {view === "saved" && (
          <section className="content-page">
            <div className="library-header">
              <div className="page-intro">
                <p className="eyebrow">Your private bar book</p>
                <h1>My recipes</h1>
              </div>
              <div className="library-tabs" aria-label="Recipe collection">
                {(["saved", "made"] as const).map((tab) => (
                  <button
                    key={tab}
                    aria-current={libraryTab === tab ? "page" : undefined}
                    className={libraryTab === tab ? "active" : ""}
                    onClick={() =>
                      navigate(
                        tab === "saved"
                          ? "/my_cocktails/favorites"
                          : "/my_cocktails/logged"
                      )
                    }
                  >
                    {tab === "saved" ? "Saved" : "Made"}{" "}
                    <span>
                      {tab === "saved" ? saved.length : logged.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {libraryRecipes.length ? (
              renderCards(libraryRecipes)
            ) : (
              <div className="empty-state">
                <Icon
                  name={libraryTab === "saved" ? "bookmark" : "book"}
                  size={32}
                />
                <h2>
                  {libraryTab === "saved"
                    ? "Your bar book is empty."
                    : "Nothing made yet."}
                </h2>
                <p>
                  {libraryTab === "saved"
                    ? "Save a recipe for when the mood strikes."
                    : "Open a recipe and mark it as made to start your tasting log."}
                </p>
                <button className="primary-button" onClick={() => search("")}>
                  Find a favorite <Icon name="arrow" />
                </button>
              </div>
            )}
          </section>
        )}
        {view === "about" && (
          <section className="content-page about-page">
            <div className="page-intro">
              <p className="eyebrow">Recipes for the home bar</p>
              <h1>
                A good drink.
                <br />
                Even better company.
              </h1>
            </div>
            <div className="about-content">
              <div>
                <h2>The home bar is open.</h2>
                <p className="muted">
                  Spirited Quarantini was created by four women who got tired of
                  the same boring cocktails at every Zoom happy hour. Stir Crazy
                  carries that spirit forward: thoughtful recipes and clear
                  instructions to help you mix with confidence from the comfort
                  of home.
                </p>
                <button className="primary-button" onClick={() => search("")}>
                  Find your next pour <Icon name="arrow" />
                </button>
              </div>
              <img
                src={require("../assets/Cheers-img.jpeg")}
                alt="Four people toasting drinks"
              />
            </div>
          </section>
        )}
      </main>
      {id && (
        <Dialog
          label={selected ? `${selected.name} recipe` : "Recipe"}
          onClose={closeRecipe}
          className="recipe-modal"
        >
          {selected ? (
            <>
              <div className="modal-image">
                <img src={selected.image} alt={`${selected.name} cocktail`} />
              </div>
              <div className="modal-content">
                <p className="eyebrow">
                  {selected.spirit} · {selected.note}
                </p>
                <h2>{selected.name}</h2>
                <div className="recipe-meta">
                  {selected.time && (
                    <span>
                      <Icon name="clock" size={17} />
                      {selected.time}
                    </span>
                  )}
                  {selected.difficulty && (
                    <span>
                      <Icon name="book" size={17} />
                      {selected.difficulty}
                    </span>
                  )}
                </div>
                <div className="recipe-columns">
                  <div>
                    <h3>What you’ll need</h3>
                    <ul>
                      {selected.ingredients.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3>Make it</h3>
                    <p>{selected.instructions}</p>
                  </div>
                </div>
                <div className="modal-actions">
                  <button
                    className="primary-button"
                    aria-pressed={isMade(selected)}
                    onClick={() =>
                      setLogged((items) =>
                        items.some((item) => item.id === selected.id)
                          ? items.filter((item) => item.id !== selected.id)
                          : [...items, selected]
                      )
                    }
                  >
                    {isMade(selected) ? (
                      <>
                        <Icon name="check" />
                        Logged as made
                      </>
                    ) : (
                      "I made this"
                    )}
                  </button>
                  <button
                    className="secondary-button"
                    aria-pressed={isSaved(selected)}
                    onClick={() => toggleSaved(selected)}
                  >
                    <Icon
                      name={isSaved(selected) ? "check" : "bookmark"}
                      size={18}
                    />
                    {isSaved(selected) ? "Saved" : "Save recipe"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state" role="status">
              <h2>
                {detailError
                  ? "This recipe is unavailable."
                  : "One moment, mixing things up…"}
              </h2>
              {detailError && (
                <>
                  <p>Please try another drink from the collection.</p>
                  <button className="secondary-button" onClick={closeRecipe}>
                    Back to recipes <Icon name="arrow" />
                  </button>
                </>
              )}
            </div>
          )}
        </Dialog>
      )}
      {accountOpen && (
        <Dialog
          label="Account"
          onClose={() => setAccountOpen(false)}
          className="account-panel"
        >
          {user ? (
            <div>
              <p className="eyebrow">Your account</p>
              <h2>
                Good evening,
                <br />
                {user}.
              </h2>
              <p className="muted">
                Your saved drinks and tasting log live right here.
              </p>
              <div className="profile-stats">
                <div>
                  <strong>{saved.length}</strong>
                  <span>Saved recipes</span>
                </div>
                <div>
                  <strong>{logged.length}</strong>
                  <span>Drinks made</span>
                </div>
              </div>
              <button
                className="primary-button"
                onClick={() => {
                  setAccountOpen(false);
                  navigate("/my_cocktails");
                }}
              >
                Open my recipes <Icon name="arrow" />
              </button>
              <button
                className="sign-out"
                onClick={() => {
                  setUser("");
                  setAccountOpen(false);
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <form onSubmit={signIn}>
              <p className="eyebrow">Welcome to Stir Crazy</p>
              <h2>
                Your home bar,
                <br />
                better organized.
              </h2>
              <p className="muted">
                Save recipes, log the drinks you make, and always know what to
                mix next.
              </p>
              <p className="local-note">
                This demo keeps your name and recipes in this browser.
              </p>
              <div className="age-note">
                <strong>21+</strong>
                <span>
                  By continuing, you confirm you’re of legal drinking age.
                </span>
              </div>
              <label>
                What should we call you?
                <input
                  name="name"
                  required
                  maxLength={40}
                  placeholder="Your first name"
                />
              </label>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                />
              </label>
              <button className="primary-button" type="submit">
                Create my bar book <Icon name="arrow" />
              </button>
              <small className="signin-note">
                No spam. No judgment about the bottom-shelf gin.
              </small>
            </form>
          )}
        </Dialog>
      )}
    </div>
  );
}
