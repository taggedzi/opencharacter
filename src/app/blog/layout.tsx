export const runtime = "nodejs"
import React from 'react';


interface BlogLayoutProps {
  children: React.ReactNode;
}

const BlogLayout: React.FC<BlogLayoutProps> = ({ children }) => {
  return (
    <div>
      {children}
    </div>
  );
};

export default BlogLayout;

