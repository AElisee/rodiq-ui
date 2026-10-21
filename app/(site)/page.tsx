import { Hero } from "./_components/hero";
import { NaturalNail } from "./_components/natural-nail";
import { Positioning } from "./_components/positioning";
import { Services } from "./_components/services";
import { ShopTeaser } from "./_components/shop-teaser";
import { VisionMission } from "./_components/vision-mission";

const HomePage = () => (
  <>
    <Hero />
    <Positioning />
    <NaturalNail />
    <VisionMission />
    <Services />
    <ShopTeaser />
  </>
);

export default HomePage;
