<?php
namespace verbb\smith\base;

use verbb\smith\Smith;
use verbb\smith\services\Field;
use verbb\base\BaseHelper;

use Craft;

use yii\log\Logger;

trait PluginTrait
{
    // Properties
    // =========================================================================

    public static Smith $plugin;


    // Static Methods
    // =========================================================================

    public static function log(string $message, array $params = []): void
    {
        $message = Craft::t('smith', $message, $params);

        Craft::getLogger()->log($message, Logger::LEVEL_INFO, 'smith');
    }

    public static function error(string $message, array $params = []): void
    {
        $message = Craft::t('smith', $message, $params);

        Craft::getLogger()->log($message, Logger::LEVEL_ERROR, 'smith');
    }


    // Public Methods
    // =========================================================================

    public function getField(): Field
    {
        return $this->get('field');
    }


    // Private Methods
    // =========================================================================

    private function _registerComponents(): void
    {
        $this->setComponents([
            'field' => Field::class,
        ]);

        BaseHelper::registerModule();
    }

    private function _registerLogTarget(): void
    {
        BaseHelper::setFileLogging('smith');
    }

}