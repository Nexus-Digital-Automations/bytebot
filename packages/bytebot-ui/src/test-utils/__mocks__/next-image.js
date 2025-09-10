/**
 * Mock for Next.js Image component
 * Used in Jest testing to avoid SSR issues
 */

import React from "react";

const NextImage = (props) => {
  return React.createElement("img", props);
};

NextImage.displayName = "NextImage";

export default NextImage;
