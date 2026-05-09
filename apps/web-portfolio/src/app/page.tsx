import { Layout } from "@/components/Layout";
import { Hero } from "@/components/sections/Hero";
import { PortfolioGrid } from "@/components/sections/PortfolioGrid";

export default function Home() {
  return (
    <Layout>
      <Hero />
      <PortfolioGrid />
      {/* Add more sections here in the future */}
    </Layout>
  );
}
