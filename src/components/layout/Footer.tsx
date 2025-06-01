import React from 'react';
import { Github, Twitter, ExternalLink, Code, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import OmnisLogo from '../common/OmnisLogo';
import { motion } from 'framer-motion';

const Footer: React.FC = () => {
  // Animation variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  };

  const linkHoverVariants = {
    hover: { scale: 1.05, x: 5, transition: { duration: 0.2 } }
  };

  return (
    <footer className="border-t border-gray-200/50 dark:border-white/5 backdrop-blur-sm bg-white/80 dark:bg-dark-200/50 py-12">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="grid grid-cols-1 gap-10 md:grid-cols-3"
        >
          <motion.div variants={itemVariants}>
            <Link to="/" className="flex items-center group">
              <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                <OmnisLogo className="h-9 w-9" />
              </motion.div>
              <span className="ml-2 text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-blue bg-clip-text text-transparent dark:from-accent-blue dark:to-accent-lavender">
                OMNIS
              </span>
            </Link>
            <p className="mt-4 text-sm text-gray-600 dark:text-dark-600 leading-relaxed">
              Explore Arweave Name Service registrations, analytics, and top holders with OMNIS - the modern ArNS explorer.
            </p>
            <div className="mt-5 flex space-x-4">
              <motion.a
                href="https://x.com/aluisyoanx"
                whileHover={{ scale: 1.1, y: -3 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-100/60 
                  text-gray-600 dark:text-dark-500 hover:text-primary-600 dark:hover:text-accent-blue
                  transition-colors duration-200 hover:shadow-sm"
                target="_blank" rel="noopener noreferrer"
              >
                <Twitter size={18} />
                <span className="sr-only">Twitter</span>
              </motion.a>
              <motion.a
                href="#"
                whileHover={{ scale: 1.1, y: -3 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-100/60 
                  text-gray-600 dark:text-dark-500 hover:text-primary-600 dark:hover:text-accent-blue
                  transition-colors duration-200 hover:shadow-sm"
                target="_blank" rel="noopener noreferrer"
              >
                <Github size={18} />
                <span className="sr-only">GitHub</span>
              </motion.a>
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-500 uppercase tracking-wider mb-1">Navigation</h3>
            <div className="h-0.5 w-10 bg-gradient-to-r from-primary-500 to-accent-blue dark:from-accent-blue dark:to-accent-lavender rounded-full mb-4"></div>
            <ul className="space-y-3">
              <li>
                <motion.div whileHover="hover">
                  <Link to="/" className="group text-sm text-gray-600 dark:text-dark-600 hover:text-primary-600 dark:hover:text-accent-blue transition-colors flex items-center">
                    <motion.span variants={linkHoverVariants} className="inline-block">Live Feed</motion.span> 
                  </Link>
                </motion.div>
              </li>
              <li>
                <motion.div whileHover="hover">
                  <Link to="/directory" className="group text-sm text-gray-600 dark:text-dark-600 hover:text-primary-600 dark:hover:text-accent-blue transition-colors flex items-center">
                    <motion.span variants={linkHoverVariants} className="inline-block">Directory</motion.span>
                  </Link>
                </motion.div>
              </li>
              <li>
                <motion.div whileHover="hover">
                  <Link to="/analytics" className="group text-sm text-gray-600 dark:text-dark-600 hover:text-primary-600 dark:hover:text-accent-blue transition-colors flex items-center">
                    <motion.span variants={linkHoverVariants} className="inline-block">Analytics Dashboard</motion.span>
                  </Link>
                </motion.div>
              </li>
              <li>
                <motion.div whileHover="hover">
                  <Link to="/holders" className="group text-sm text-gray-600 dark:text-dark-600 hover:text-primary-600 dark:hover:text-accent-blue transition-colors flex items-center">
                    <motion.span variants={linkHoverVariants} className="inline-block">Top Holders</motion.span>
                  </Link>
                </motion.div>
              </li>
            </ul>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-500 uppercase tracking-wider mb-1">Resources</h3>
            <div className="h-0.5 w-10 bg-gradient-to-r from-primary-500 to-accent-blue dark:from-accent-blue dark:to-accent-lavender rounded-full mb-4"></div>
            <ul className="space-y-3">
              <li>
                <motion.div whileHover="hover">
                  <a href="https://docs.ar.io/" target="_blank" rel="noopener noreferrer"
                     className="group text-sm text-gray-600 dark:text-dark-600 hover:text-primary-600 dark:hover:text-accent-blue transition-colors flex items-center">
                    <motion.span variants={linkHoverVariants} className="inline-block">ArNS Documentation</motion.span>
                    <ExternalLink size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </motion.div>
              </li>
              <li>
                <motion.div whileHover="hover">
                  <a href="https://arweave.org" target="_blank" rel="noopener noreferrer"
                     className="group text-sm text-gray-600 dark:text-dark-600 hover:text-primary-600 dark:hover:text-accent-blue transition-colors flex items-center">
                    <motion.span variants={linkHoverVariants} className="inline-block">Arweave</motion.span>
                    <ExternalLink size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </motion.div>
              </li>
              <li>
                <motion.div whileHover="hover">
                  <a href="https://ar.io" target="_blank" rel="noopener noreferrer"
                     className="group text-sm text-gray-600 dark:text-dark-600 hover:text-primary-600 dark:hover:text-accent-blue transition-colors flex items-center">
                    <motion.span variants={linkHoverVariants} className="inline-block">AR.IO</motion.span>
                    <ExternalLink size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </motion.div>
              </li>
              <li>
                <motion.div whileHover="hover">
                  <a href="https://arns.ar.io" target="_blank" rel="noopener noreferrer"
                     className="group text-sm text-gray-600 dark:text-dark-600 hover:text-primary-600 dark:hover:text-accent-blue transition-colors flex items-center">
                    <motion.span variants={linkHoverVariants} className="inline-block">ArNS</motion.span>
                    <ExternalLink size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </motion.div>
              </li>
            </ul>
          </motion.div>
        </motion.div>
        
        <div className="mt-12 pt-6 border-t border-gray-200/30 dark:border-white/5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500 dark:text-dark-600 flex items-center">
              &copy; {new Date().getFullYear()} OMNIS. All rights reserved.
            </p>
            <p className="text-sm text-gray-500 dark:text-dark-600 flex items-center">
              <span>Made with</span>
              <Heart size={14} className="mx-1 text-accent-red" />
              <span>and</span>
              <Code size={14} className="mx-1 text-accent-blue" />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;