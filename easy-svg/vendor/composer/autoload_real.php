<?php

// autoload_real.php @generated by Composer

class ComposerAutoloaderInit94ea64f5c2f73fb7a33ff877ce4aebd4
{
    private static $loader;

    public static function loadClassLoader($class)
    {
        if ('Composer\Autoload\ClassLoader' === $class) {
            require __DIR__ . '/ClassLoader.php';
        }
    }

    /**
     * @return \Composer\Autoload\ClassLoader
     */
    public static function getLoader()
    {
        if (null !== self::$loader) {
            return self::$loader;
        }

        require __DIR__ . '/platform_check.php';

        spl_autoload_register(array('ComposerAutoloaderInit94ea64f5c2f73fb7a33ff877ce4aebd4', 'loadClassLoader'), true, true);
        self::$loader = $loader = new \Composer\Autoload\ClassLoader(\dirname(__DIR__));
        spl_autoload_unregister(array('ComposerAutoloaderInit94ea64f5c2f73fb7a33ff877ce4aebd4', 'loadClassLoader'));

        require __DIR__ . '/autoload_static.php';
        call_user_func(\Composer\Autoload\ComposerStaticInit94ea64f5c2f73fb7a33ff877ce4aebd4::getInitializer($loader));

        $loader->register(true);

        return $loader;
    }
}
