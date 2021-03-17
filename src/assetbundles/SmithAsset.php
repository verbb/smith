<?php
namespace verbb\smith\assetbundles;

use Craft;
use craft\web\AssetBundle;
use craft\web\assets\cp\CpAsset;
use craft\web\assets\matrix\MatrixAsset;
use craft\web\View;

use verbb\base\assetbundles\CpAsset as VerbbCpAsset;

class SmithAsset extends AssetBundle
{
    // Public Methods
    // =========================================================================

    public function init()
    {
        $this->sourcePath = "@verbb/smith/resources/dist";

        $this->depends = [
            VerbbCpAsset::class,
            CpAsset::class,
            MatrixAsset::class
        ];

        $this->js = [
            'js/smith.js',
        ];

        $this->css = [
            'css/smith.css',
        ];

        parent::init();
    }

    public function registerAssetFiles($view)
    {
        parent::registerAssetFiles($view);

        if ($view instanceof View) {
            $view->registerTranslations('app', [
                'Copy',
                'Paste',
                'Clone',
                '1 block copied',
                '{n} blocks copied',
            ]);
        }
    }
}
