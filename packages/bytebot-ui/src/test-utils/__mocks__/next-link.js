/**
 * Mock for Next.js Link component
 * Used in Jest testing to avoid router dependencies
 */

import React from 'react';

const NextLink = ({ children, href, ...props }) => {
  return React.createElement('a', { href, ...props }, children);
};

NextLink.displayName = 'NextLink';

export default NextLink;