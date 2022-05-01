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

        $this->_registerComponents();
        $this->_registerLogTarget();

        Event::on(Plugins::class, Plugins::EVENT_AFTER_LOAD_PLUGINS, function() {
            if ($this->isInstalled && !Craft::$app->getPlugins()->isPluginUpdatePending($this)) {
                if (!Craft::$app->getRequest()->getIsCpRequest() || Craft::$app->getRequest()->getAcceptsJson()) {
                    return;
                }

                $view = Craft::$app->getView();
                $view->registerAssetBundle(SmithAsset::class);
                $view->registerJs('new Craft.Smith.Init();');
            }
        });
    }
}
