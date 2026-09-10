'use client'
import { TestimonialCardProps } from "@/types";
import { motion } from "motion/react";
import Image from "next/image";

export default function TestimonialCard({ testimonial, index }: TestimonialCardProps) {
    return (
        <motion.div className="p-4 rounded-lg mx-4 w-72 shrink-0 bg-pink-950/30 border border-pink-950"
            initial={{ y: 150, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.15, type: "spring", stiffness: 320, damping: 70, mass: 1 }}
        >
            <div className="flex gap-2">
                <Image className="size-11 rounded-full" src={testimonial.image} alt={testimonial.name} height={50} width={50} />
                <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                        <p>{testimonial.name}</p>
                    </div>
                    <span className="text-xs text-slate-500">{testimonial.handle}</span>
                </div>
            </div>
            <p className="text-sm pt-4 text-slate-500 line-clamp-2">
                {testimonial.quote}
            </p>
        </motion.div>
    );
}