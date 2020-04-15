<?php
namespace verbb\smith\base;

use verbb\smith\Smith;
use verbb\smith\services\Field;

use Craft;
use craft\log\FileTarget;

use yii\log\Logger;

use verbb\base\BaseHelper;

trait PluginTrait
{
    // Static Properties
    // =========================================================================

    public static $plugin;


    // Public Methods
    // =========================================================================

    public function getField()
    {
        return $this->get('field');
    }

    public static function log($message)
    {
        Craft::getLogger()->log($message, Logger::LEVEL_INFO, 'smith');
    }

    public static function error($message)
    {
        Craft::getLogger()->log($message, Logger::LEVEL_ERROR, 'smith');
    }


    // Private Methods
    // =========================================================================

    private function _setPluginComponents()
    {
        $this->setComponents([
            'field' => Field::class,
        ]);

        BaseHelper::registerModule();
    }

    private function _setLogging()
    {
        BaseHelper::setFileLogging('smith');
    }

}