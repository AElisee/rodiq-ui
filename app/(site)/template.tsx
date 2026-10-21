import { ViewTransition } from "react";

// Le template est remonté à chaque navigation : fondu enchaîné entre les pages
const SiteTemplate = ({ children }: { children: React.ReactNode }) => (
  <ViewTransition enter="page-fade" exit="page-fade" default="none">
    {children}
  </ViewTransition>
);

export default SiteTemplate;
