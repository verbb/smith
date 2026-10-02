<?php
namespace verbb\smith;

use verbb\smith\web\assets\cp\SmithAsset;
use verbb\smith\base\PluginTrait;

use Craft;
use craft\base\Field;
use craft\base\Plugin;
use craft\fields\Matrix;
use craft\web\View;

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
            if (
                !Craft::$app->getRequest()->getIsCpRequest() ||
                Craft::$app->getUser()->getIsGuest() ||
                version_compare(Craft::$app->getVersion(), '5.7.0', '>=')
            ) {
                return;
            }

            Event::on(Matrix::class, Field::EVENT_DEFINE_INPUT_HTML, function() {
                $view = Craft::$app->getView();
                $view->registerAssetBundle(SmithAsset::class);
                $view->registerJs(
                    'Craft.Smith.instance = Craft.Smith.instance || new Craft.Smith.Init();',
                    View::POS_READY,
                    'smith-init',
                );
            });
        });
    }
}
