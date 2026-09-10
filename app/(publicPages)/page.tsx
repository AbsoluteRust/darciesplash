
import CTASection from "@/sections/CTASection";
import TestimonialSection from "@/sections/TestimonialSection";
import AccordionGallery from "@/sections/AccordionGallery";
import { ITEMS } from "@/sections/AccordionGallery";

export default function Page() {
  return (
    <>
      <div style={{ height: "120px" }} />

      <AccordionGallery
        items={ITEMS}   // ← FIXED
        height={1300}
      />

      <TestimonialSection />
      <CTASection />
    </>
  );
}
