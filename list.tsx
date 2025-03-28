import React from 'react';

interface ListItem {
  id: number;
  title: string;
  description: string;
}

const List = () => {
  const items: ListItem[] = [
    {
      id: 1,
      title: '第一项',
      description: '这是第一项的描述'
    },
    {
      id: 2,
      title: '第二项',
      description: '这是第二项的描述'
    },
    {
      id: 3,
      title: '第三项',
      description: '这是第三项的描述'
    }
  ];

  return (
    <div className="w-full max-w-md mx-auto">
      <ul className="divide-y divide-gray-200">
        {items.map((item) => (
          <li 
            key={item.id}
            className="py-4 flex items-center hover:bg-gray-50 cursor-pointer"
          >
            <div className="ml-4 flex-1">
              <h3 className={`text-sm font-medium ${item.id === 2 ? 'text-red-500' : 'text-gray-900'}`}>
                {item.title}
              </h3>
              <p className={`text-sm ${item.id === 2 ? 'text-red-400' : 'text-gray-500'}`}>
                {item.description}
              </p>
            </div>
            <div className="ml-4">
              <svg 
                className="h-5 w-5 text-gray-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default List;