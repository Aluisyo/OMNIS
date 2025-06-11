import { FC } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, Globe, User } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../components/common/Button';
import { useData } from '../contexts/DataContext';
import PageLoading from '../components/common/PageLoading';
import ErrorMessage from '../components/common/ErrorMessage';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';

const UndernameDetails: FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { records, loading, error } = useData();

  if (loading) return <PageLoading />;
  if (error) return <ErrorMessage message={error} />;

  // Find parent record containing this undername
  const parent = records.find(r => Array.isArray(r.underNames) && r.underNames.some(u => u.name === name));
  if (!parent) return <ErrorMessage message={`No parent ARNS found for undername ${name}`} />;

  // Animation variants
  const pageVariants = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
  const itemVariants = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };
  const detailItemVariants = { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.3 } } };

  return (
    <motion.div className="space-y-6 p-4" initial="initial" animate="animate" exit="exit" variants={pageVariants}>
      <motion.div variants={itemVariants}>
        <Button
          variant="ghost"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-0 transition-all duration-300"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Directory
        </Button>
        <h1 className="mt-2 text-2xl font-bold bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 text-transparent">
          {name}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Undername Details</p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-800/50 shadow-xl hover:shadow-2xl transition-all duration-300 max-w-3xl mx-auto">
          <CardHeader className="flex flex-col space-y-2 p-4 border-b border-gray-200/50 dark:border-gray-800/50">
            <motion.div className="flex items-center gap-2" variants={itemVariants}>
              <Hash className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-xl font-semibold bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent">
                Undername: <span className="font-mono">{name}</span>
              </CardTitle>
            </motion.div>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <motion.div
              variants={detailItemVariants}
              className="flex items-center justify-between py-3 text-sm group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-md px-2 transition-all"
            >
              <span className="text-gray-600 dark:text-gray-400 flex items-center">
                <User className="h-4 w-4 mr-2 text-blue-500" />
                Parent ARNS:
              </span>
              <Link
                to={`/name/${parent.name}`}
                className="font-mono text-blue-600 dark:text-blue-400 hover:underline"
              >
                {parent.name}
              </Link>
            </motion.div>
            <motion.div
              variants={detailItemVariants}
              className="flex flex-col py-3 text-sm group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-md px-2 transition-all"
            >
              <span className="text-gray-600 dark:text-gray-400 flex items-center">
                <Globe className="h-4 w-4 mr-2 text-blue-500" />
                Preview:
              </span>
              <div
                className="mt-2 relative w-full rounded-lg overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-800/50"
                style={{ minHeight: '240px', height: 'auto' }}
              >
                <iframe
                  src={`https://${name}_${parent.name}.ar.io`}
                  title="Undername Preview"
                  className="w-full h-[400px] min-h-[240px] sm:h-[400px] border-0 rounded-lg"
                  allowFullScreen
                />
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default UndernameDetails;
