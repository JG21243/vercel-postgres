import { useState } from "react";

export const LegalPromptSearch = ({
  onSearch,
  handleSubmit,
  inputValue,
  setInputValue,
  submitted,
}: {
  onSearch: (query: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  inputValue: string;
  setInputValue: (value: string) => void;
  submitted: boolean;
}) => {
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSearch(inputValue);
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="flex items-center space-x-2">
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