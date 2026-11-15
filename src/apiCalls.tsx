import { Cocktail } from "./Definitions/RandomCocktail";
import { AllCocktailsDetails } from "./App/App";

const rootUrl = "https://www.thecocktaildb.com/api/json/v1/1";
																										
export const getAllCocktails = async (): Promise<AllCocktailsDetails[]> => {
  const response = await fetch(`${rootUrl}/filter.php?a=Alcoholic`);

  if(response.ok) {
		const data = await response.json();
    return data.drinks;
  } else {
    throw new Error(response.statusText);
  }
};

export const getRandomCocktail = async ():Promise<Cocktail> => {
  const response = await fetch(`${rootUrl}/random.php`);
  
  if(response.ok) {
    const data = await response.json();
    return data.drinks[0];
  } else {
    throw new Error(response.statusText);
  }
}
  
export const getCocktailDetails = async (givenID: string) => {
	const response = await fetch(`${rootUrl}/lookup.php?i=${parseInt(givenID)}`);
  
  if(response.ok) {
    const data = await response.json();
    return data.drinks[0];
  } else {
    throw new Error(response.statusText);
  }
}
// Search names and ingredients without downloading every recipe on startup.
export const searchCocktails = async (query: string): Promise<Cocktail[]> => {
  const term = encodeURIComponent(query);
  const responses = await Promise.all([
    fetch(`${rootUrl}/search.php?s=${term}`),
    fetch(`${rootUrl}/filter.php?i=${term}`),
  ]);
  const successful = responses.filter(response => response.ok);
  if (!successful.length) throw new Error('Cocktail search unavailable');
  const payloads = await Promise.all(successful.map(response => response.json()));
  const drinks: Cocktail[] = [];
  payloads.forEach(payload => {
    (payload.drinks || []).forEach((drink: Cocktail) => {
      if (!drinks.some(item => item.idDrink === drink.idDrink)) drinks.push(drink);
    });
  });
  return drinks;
};
