import { useState } from "react";

export const UnicornSearch = ({ onSearch }: { onSearch: (query: string) => void }) => {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSearch(inputValue);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Ask about legal prompts, e.g., 'Show all prompts in category X'"
        className="input"
      />
      <button type="submit" className="btn">
        Search
      </button>
    </form>
  );
};