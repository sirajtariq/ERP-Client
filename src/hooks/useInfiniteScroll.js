import { useCallback } from "react";

const useInfiniteScroll = ({ pageObject, fetchFunction, searchValue }) => {
  const handleScroll = useCallback(
    (e) => {
      const target = e.target;
      const isAtBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 5;
      const hasMore = (pageObject.current + 1) * pageObject.size < pageObject.total;
      if (isAtBottom && hasMore) {
        fetchFunction(pageObject.current + 1, searchValue);
      }
    },
    [pageObject, fetchFunction, searchValue]
  );
  return handleScroll;
};

export default useInfiniteScroll;
