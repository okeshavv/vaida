import { motion } from 'framer-motion';

interface LoadingDotsProps {
    /** Message shown below the dots */
    message?: string;
    /** 'teal' for light backgrounds, 'white' for dark backgrounds */
    color?: 'teal' | 'white';
    /** 'inline' sits in-flow; 'fullpage' centers in the viewport */
    variant?: 'inline' | 'fullpage';
    /** Dot size in px */
    size?: number;
}

const dotVariants = {
    initial: { y: 0, opacity: 0.4 },
    animate: { y: -8, opacity: 1 },
};

export default function LoadingDots({
    message,
    color = 'teal',
    variant = 'inline',
    size = 9,
}: LoadingDotsProps) {
    const dotColor = color === 'white' ? 'bg-white' : 'bg-teal-600';
    const textColor = color === 'white' ? 'text-white/70' : 'text-slate-500';

    const dots = (
        <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
                {[0, 1, 2].map((i) => (
                    <motion.span
                        key={i}
                        className={`rounded-full ${dotColor}`}
                        style={{ width: size, height: size }}
                        variants={dotVariants}
                        initial="initial"
                        animate="animate"
                        transition={{
                            duration: 0.5,
                            repeat: Infinity,
                            repeatType: 'reverse',
                            ease: 'easeInOut',
                            delay: i * 0.15,
                        }}
                    />
                ))}
            </div>
            {message && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className={`text-xs font-medium tracking-wide ${textColor}`}
                >
                    {message}
                </motion.p>
            )}
        </div>
    );

    if (variant === 'fullpage') {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
            >
                {dots}
            </motion.div>
        );
    }

    return dots;
}
