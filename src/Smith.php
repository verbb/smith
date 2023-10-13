<?php
namespace verbb\smith;

use verbb\smith\assetbundles\SmithAsset;
use verbb\smith\base\PluginTrait;

use Craft;
use craft\base\Plugin;
use craft\services\Plugins;

use yii\base\Event;

class Smith extends Plugin
{
    // Properties
    // =========================================================================

    public string $schemaVersion = '1.0.0';


    // Traits
    // =========================================================================

    use PluginTrait;


    // Public Methods
    // =========================================================================

    public function init(): void
    {
        parent::init();

        self::$plugin = $this;

        // Defer most setup tasks until Craft is fully initialized:
        Craft::$app->onInit(function() {
            if (Craft::$app->getRequest()->getIsCpRequest()) {
                $view = Craft::$app->getView();
                $view->registerAssetBundle(SmithAsset::class);
                $view->registerJs('new Craft.Smith.Init();');
            }
        });
    }
}
