import { Navigation } from "@/components/Navigation";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { storeConfig } from "@/config/store";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-6 container mx-auto text-center">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-sm uppercase tracking-[0.3em] text-gray-500 block mb-6"
        >
          Desde {storeConfig.foundedYear}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-6xl md:text-8xl font-serif mb-8 leading-tight"
        >
          {storeConfig.about.heroTitle}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-2xl mx-auto text-lg md:text-xl font-light text-gray-600 leading-relaxed"
        >
          {storeConfig.about.heroSubtitle}
        </motion.p>
      </div>

      {/* Philosophy Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-[80vh]">
        <div className="bg-gray-100 relative overflow-hidden group">
          <motion.div
            initial={{ scale: 1.2 }}
            whileInView={{ scale: 1 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            {/* Placeholder for Atelier Image - reusing an asset for now */}
            <div className="w-full h-full bg-black/5" />
          </motion.div>
          <div className="absolute inset-0 flex items-center justify-center p-12">
            <h3 className="text-4xl md:text-5xl font-serif italic text-center text-gray-400">
              "{storeConfig.about.quote}"
            </h3>
          </div>
        </div>
        <div className="flex items-center justify-center p-12 lg:p-24 bg-black text-white">
          <div className="max-w-md">
            <h2 className="text-3xl font-serif mb-8">{storeConfig.about.philosophy.title}</h2>
            {storeConfig.about.philosophy.paragraphs.map((paragraph, index) => (
              <p key={index} className={`text-gray-400 leading-relaxed font-light ${index === storeConfig.about.philosophy.paragraphs.length - 1 ? 'mb-12' : 'mb-8'}`}>
                {paragraph}
              </p>
            ))}
            {/*
            <div className="flex items-center gap-4 text-sm uppercase tracking-widest">
              <span>Leia nosso Journal</span>
              <ArrowRight className="w-4 h-4" />
            </div>
            */}
          </div>
        </div>
      </div>

      {/* Process / Craftsmanship */}
      <div className="py-32 container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20">
          <h2 className="text-4xl md:text-5xl font-serif max-w-xl leading-tight mb-8 md:mb-0">
            {storeConfig.about.craftsmanship.title.split('&').map((part, i) => (
              <span key={i}>{part}{i === 0 && <><br />&</>}</span>
            ))}
          </h2>
          <p className="max-w-sm text-gray-500 font-light text-right">
            {storeConfig.about.craftsmanship.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {storeConfig.about.craftsmanship.items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="border-t border-gray-200 pt-8"
            >
              <span className="text-xs text-gray-400 block mb-4">0{i + 1}</span>
              <h3 className="text-2xl font-serif mb-4">{item.title}</h3>
              <p className="text-gray-500 font-light leading-relaxed text-sm">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <footer className="bg-gray-100 py-24 text-center border-t border-gray-100">
        <h2 className="text-9xl font-serif opacity-10 mb-8">{storeConfig.shortName}</h2>
        <p className="text-xs uppercase tracking-widest opacity-50">
          Estabelecida em {storeConfig.foundedYear}
        </p>
      </footer>
    </div>
  );
}
