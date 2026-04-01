import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { storeConfig } from "@/config/store";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="min-h-screen flex flex-col lg:flex-row pt-20 lg:pt-0">
        {/* Left Column: Info */}
        <div className="w-full lg:w-1/2 bg-black text-white p-12 lg:p-24 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm uppercase tracking-[0.3em] text-gray-400 block mb-6">
              Atendimento
            </span>
            <h1 className="text-5xl md:text-7xl font-serif mb-12 leading-tight">
              Entre em <br /> Contato
            </h1>

            <div className="space-y-12">
              <div className="flex gap-6 items-start group cursor-pointer">
                <div className="p-3 border border-white/20 rounded-full group-hover:bg-white group-hover:text-black transition-colors">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-serif mb-2">
                    Visite Nosso Showroom
                  </h3>
                  <p className="text-gray-400 font-light leading-relaxed">
                    {storeConfig.address.street}
                    <br />
                    {storeConfig.address.neighborhood}, {storeConfig.address.city} - {storeConfig.address.state}
                    <br />
                  </p>
                </div>
              </div>

              <div className="flex gap-6 items-start group cursor-pointer">
                <div className="p-3 border border-white/20 rounded-full group-hover:bg-white group-hover:text-black transition-colors">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-serif mb-2">Envie um E-mail</h3>
                  <p className="text-gray-400 font-light leading-relaxed">
                    Geral: {storeConfig.contact.email}
                  </p>
                </div>
              </div>

              <div className="flex gap-6 items-start group cursor-pointer">
                <div className="p-3 border border-white/20 rounded-full group-hover:bg-white group-hover:text-black transition-colors">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-serif mb-2">Ligue para Nós</h3>
                  <p className="text-gray-400 font-light leading-relaxed">
                    {storeConfig.contact.phone}
                    <br />
                    {storeConfig.contact.hours}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Form */}
        <div className="w-full lg:w-1/2 bg-white p-12 lg:p-24 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-md mx-auto w-full"
          >
            <h2 className="text-3xl font-serif mb-8">Envie uma Mensagem</h2>
            <form className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-gray-500">
                    Nome
                  </label>
                  <Input className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-black transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-gray-500">
                    Sobrenome
                  </label>
                  <Input className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-black transition-colors" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-gray-500">
                  E-mail
                </label>
                <Input
                  type="email"
                  className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-black transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-gray-500">
                  Assunto
                </label>
                <select className="w-full py-2 bg-transparent border-b border-gray-200 text-sm focus:outline-none focus:border-black">
                  <option>Dúvida Geral</option>
                  <option>Status do Pedido</option>
                  <option>Trocas e Devoluções</option>
                  <option>Imprensa e Mídia</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-gray-500">
                  Mensagem
                </label>
                <textarea
                  rows={4}
                  className="w-full py-2 bg-transparent border-b border-gray-200 text-sm focus:outline-none focus:border-black resize-none"
                />
              </div>

              <Button className="w-full h-14 bg-black text-white hover:bg-gray-800 rounded-none uppercase tracking-widest text-sm flex justify-between items-center px-6 group">
                <span>Enviar Mensagem</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
