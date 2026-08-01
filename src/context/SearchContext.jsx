import { createContext, useContext, useState } from "react";

const SearchContext = createContext(null);

export const SearchProvider = ({ children }) => {
  const [searchText, setSearchText] = useState("");
  const [placeholder, setPlaceholder] = useState("Search customer, invoice, item...");

  const clearSearch = () => setSearchText("");

  return (
    <SearchContext.Provider value={{ searchText, setSearchText, placeholder, setPlaceholder, clearSearch }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) throw new Error("useSearch must be used within SearchProvider");
  return context;
};
