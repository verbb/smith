<?php
namespace verbb\smith;

use verbb\smith\assetbundles\SmithAsset;
use verbb\smith\base\PluginTrait;

use Craft;
use craft\base\Plugin;
use craft\events\RegisterUrlRulesEvent;
use craft\services\Plugins;
use craft\web\UrlManager;

use yii\base\Event;

class Smith extends Plugin
{
    // Public Properties
    // =========================================================================

    public $schemaVersion = '1.0.0';


    // Traits
    // =========================================================================

    use PluginTrait;


    // Public Methods
    // =========================================================================

    public function init()
    {
        parent::init();

        self::$plugin = $this;

        $this->_setPluginComponents();
        $this->_setLogging();

        Event::on(Plugins::class, Plugins::EVENT_AFTER_LOAD_PLUGINS, function() {
            if ($this->isInstalled && !Craft::$app->plugins->doesPluginRequireDatabaseUpdate($this)) {
                if (!Craft::$app->request->isCpRequest || Craft::$app->request->getAcceptsJson()) {
                    return;
                }

                $view = Craft::$app->getView();
                $view->registerAssetBundle(SmithAsset::class);
                $view->registerJs('new Craft.Smith.Init();');
            }
        });
    }
}
