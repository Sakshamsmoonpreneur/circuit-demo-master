import { useEffect, useState } from "react";

interface IUseDimensionsProps {
    resize?: boolean;
}

const useDimensions = ({ resize = true }: IUseDimensionsProps = {}) => {
    const [dimensions, setDimensions] = useState({
        height: 0,
        width: 0,
    });

    useEffect(() => {
        function handleResize() {
            setDimensions({
                height: document.documentElement.clientHeight,
                width: document.documentElement.clientWidth,
            });
        }

        // Set initial dimensions on mount
        handleResize();

        if (resize) {
            window.addEventListener("resize", handleResize);
            return () => window.removeEventListener("resize", handleResize);
        }
    }, [resize]);

    return dimensions;
};

export default useDimensions;
