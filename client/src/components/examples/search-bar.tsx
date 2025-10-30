import { SearchBar } from '../search-bar';

export default function SearchBarExample() {
  return (
    <div className="p-6 max-w-2xl">
      <SearchBar
        onSearch={(q) => console.log('Search:', q)}
        onFilterClick={() => console.log('Filter clicked')}
      />
    </div>
  );
}
