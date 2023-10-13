<?php
namespace verbb\smith\base;

use verbb\smith\Smith;
use verbb\smith\services\Field;

use verbb\base\LogTrait;
use verbb\base\helpers\Plugin;

trait PluginTrait
{
    // Properties
    // =========================================================================

    public static ?Smith $plugin = null;


    // Traits
    // =========================================================================

    use LogTrait;


    // Static Methods
    // =========================================================================

    public static function config(): array
    {
        Plugin::bootstrapPlugin('smith');

        return [
            'components' => [
                'field' => Field::class,
            ],
        ];
    }


    // Public Methods
    // =========================================================================

    public function getField(): Field
    {
        return $this->get('field');
    }

}