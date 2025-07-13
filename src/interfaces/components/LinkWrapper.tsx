import type {FC, ReactNode, SyntheticEvent} from "react";
import {Link} from "react-router";

const LinkWrapper: FC<{
    to: string,
    enableLinks: boolean,
    className?: string,
    onClick?: (e: SyntheticEvent) => void,
    children: ReactNode | ReactNode[]
}> = ({ to, enableLinks, className, onClick, children }) => {
    return enableLinks ? <Link to={to} onClick={onClick} className={className}>{ children }</Link> : children
}

export default LinkWrapper