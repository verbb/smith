<?php
namespace verbb\smith\web\assets\cp;

use craft\web\AssetBundle;
use craft\web\assets\cp\CpAsset;
use craft\web\assets\matrix\MatrixAsset;
use craft\web\View;

use verbb\base\web\assets\cp\CpAsset as VerbbCpAsset;

class SmithAsset extends AssetBundle
{
    // Public Methods
    // =========================================================================

    public function init(): void
    {
        $this->sourcePath = '@verbb/smith/web/assets/cp/dist';

        $this->depends = [
            VerbbCpAsset::class,
            CpAsset::class,
            MatrixAsset::class,
        ];

        $this->js = [
            'smith.js',
        ];

        $this->css = [
            'smith.css',
        ];

        parent::init();
    }

    public function registerAssetFiles($view): void
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
