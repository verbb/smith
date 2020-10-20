// ==========================================================================

// Smith Plugin for Craft CMS
// Author: Verbb - https://verbb.io/

// ==========================================================================

if (typeof Craft.Smith === typeof undefined) {
    Craft.Smith = {};
}

(function($) {

Craft.Smith.Init = Garnish.Base.extend({
    init: function(options) {
        Garnish.requestAnimationFrame($.proxy(function() {
            var $matrixFields = Garnish.$doc.find('.matrix-field');

            for (var i = 0; i < $matrixFields.length; i++) {
                var $matrixField = $($matrixFields[i]);
                var $matrixBlocks = $matrixField.find('> .blocks > .matrixblock');

                for (var j = 0; j < $matrixBlocks.length; j++) {
                    var $matrixBlock = $($matrixBlocks[j]);
                    var $settingsBtn = $matrixBlock.find('.actions .settings.menubtn');
                    var menuBtn = $settingsBtn.data('menubtn') || false;

                    if (!menuBtn) {
                        return;
                    }

                    // Create a new class for this specific Matrix field and block
                    new Craft.Smith.Menu($matrixField, $matrixBlock, $matrixBlocks, menuBtn);
                }
            }

            // Create a callback for new blocks
            Garnish.on(Craft.MatrixInput, 'blockAdded', $.proxy(this, 'blockAdded'));

            // Allow for Super Table's nested Matrix JS
            if (Craft.SuperTable && Craft.SuperTable.MatrixInputAlt) {
                Garnish.on(Craft.SuperTable.MatrixInputAlt, 'blockAdded', $.proxy(this, 'blockAdded'));
            }
        }, this));
    },

    blockAdded: function(e) {
        Garnish.requestAnimationFrame($.proxy(function() {
            var $matrixField = e.target.$container;
            var $matrixBlocks = $matrixField.find('> .blocks > .matrixblock');
            var $matrixBlock = $(e.$block);

            var $settingsBtn = $matrixBlock.find('.actions .settings.menubtn');
            var menuBtn = $settingsBtn.data('menubtn') || false;

            // Try again if the menu button isn't initialised yet
            if (!menuBtn) {
                this.blockAdded(e);
                return;
            }

            new Craft.Smith.Menu($matrixField, $matrixBlock, $matrixBlocks, menuBtn);
        }, this));
    },
});

Craft.Smith.Menu = Garnish.Base.extend({
    init: function($matrixField, $matrixBlock, $matrixBlocks, menuBtn) {
        this.$matrixField = $matrixField;
        this.$matrixBlock = $matrixBlock;
        this.$matrixBlocks = $matrixBlocks;
        this.menuBtn = menuBtn;
        this.menu = menuBtn.menu;

        // Keep track of the delete option - we want to insert before that
        var $deleteOption = this.menu.$container.find('a[data-action="delete"]').parents('li');

        // Create our buttons
        this.$copyBtn = $('<a data-icon="copy" data-action="copy">' + Craft.t('app', 'Copy') + '</a>');
        this.$pasteBtn = $('<a data-icon="paste" data-action="paste">' + Craft.t('app', 'Paste') + '</a>');
        this.$cloneBtn = $('<a data-icon="clone" data-action="clone">' + Craft.t('app', 'Clone') + '</a>');

        // Add new menu items to the DOM
        this.$copyBtn.insertBefore($deleteOption).wrap('<li/>');
        this.$pasteBtn.insertBefore($deleteOption).wrap('<li/>');
        this.$cloneBtn.insertBefore($deleteOption).wrap('<li/>');
        $('<hr class="padded">').insertBefore($deleteOption);

        // Add new menu items to the menu
        this.menu.addOptions(this.$copyBtn);
        this.menu.addOptions(this.$pasteBtn);
        this.menu.addOptions(this.$cloneBtn);

        // Hook into all menu items
        this.menu.on('optionselect', $.proxy(this, 'onOptionSelect'));
        this.menu.on('show', $.proxy(this, 'onMenuShow'));

        // Perform some checks
        this.checkPaste();
    },

    onMenuShow: function(e) {
        this.checkPaste();
    },

    onOptionSelect: function(e) {
        var $option = $(e.selectedOption);

        if ($option.hasClass('disabled') || $option.hasClass('sel')) {
            return;
        }

        if ($option.data('action') == 'copy') {
            this.copyBlock(e);
        }

        if ($option.data('action') == 'paste') {
            this.pasteBlock(e);
        }

        if ($option.data('action') == 'clone') {
            this.cloneBlock(e);
        }
    },

    checkPaste: function() {
        var canPaste = false;

        try {
            var data = JSON.parse(localStorage.getItem('smith:block'));
            var fieldHandle = this.$matrixField.attr('id');

            // Find copy data for this field
            if (data && fieldHandle.includes('fields-' + data.field)) {
                canPaste = true;
            }
        } catch(e) { }

        if (!canPaste) {
            this.$pasteBtn.disable();
        } else {
            this.$pasteBtn.enable();
        }
    },

    copyBlock: function(e) {
        var data = this._serializeBlocks();

        localStorage.setItem('smith:block', JSON.stringify(data));

        var count = data.blocks.length;
        var message = count == 1 ? '1 block copied' : '{n} blocks copied';

        Craft.cp.displayNotice(Craft.t('app', message, { n: count }));

        this.checkPaste();
    },

    pasteBlock: function(e, data) {
        try {
            if (!data) {
                var data = JSON.parse(localStorage.getItem('smith:block'));
            }

            var $blockContainer = this.$matrixField.find('.blocks');
            var $spinner = $('<div class="spinner smith-spinner"></div>').insertAfter(this.$matrixBlock);

            // Get the Matrix field JS instance
            var matrixField = this.$matrixField.data('matrix');

            // Figure out the next block, to instruct Matrix to insert before that one
            var $insertBefore = null;

            this.$matrixBlocks.each($.proxy(function(index, element) {
                if (this.$matrixBlock.data('id') == $(element).data('id')) {
                    var nextBlock = this.$matrixBlocks[index + 1];

                    if (nextBlock) {
                        return $insertBefore = $(nextBlock);
                    }
                }
            }, this));

            // Have to replace the placeholderKey from the copied matrix. Very likely its been copied on one
            // field, and pasted on another so that placeholderKey will be different.
            data.placeholderKey = matrixField.settings.placeholderKey;

            // Fetch the blocks, rendered with values
            Craft.postActionRequest('smith/field/render-matrix-blocks', data, $.proxy(function(response, textStatus) {
                if (textStatus === 'success' && response.success) {
                    for (var i = 0; i < response.blocks.length; i++) {
                        var block = response.blocks[i];

                        // Save the blocktype content
                        var originalBlock = matrixField.blockTypesByHandle[block.typeHandle];

                        // Prep the Matrix field to know about our updated blocks (with rendered content)
                        matrixField.blockTypesByHandle[block.typeHandle] = block;

                        // Trigger the addBlock function - this adds a new block, so we're not duplicating code
                        var $newBlock = matrixField.addBlock(block.typeHandle, $insertBefore);

                        // Then, re-set back, so new blocks don't use copied content
                        matrixField.blockTypesByHandle[block.typeHandle] = originalBlock;
                    };
                }

                // Hide the spinner
                $spinner.remove();
            }, this));
        } catch(e) { }
    },

    cloneBlock: function(e) {
        var data = this._serializeBlocks();

        this.pasteBlock(e, data);
    },

    _serializeBlocks: function() {
        var data = {
            field: '',
            namespace: '',
            blocks: []
        };

        var matrixField = this.$matrixField.data('matrix');
        var $selectedItems = matrixField.blockSelect.$selectedItems;

        data.placeholderKey = matrixField.settings.placeholderKey;

        if (!$selectedItems.length) {
            $selectedItems = this.$matrixBlock;
        }

        for (var i = 0; i < $selectedItems.length; i++) {
            var $blockItem = $($selectedItems[i]);

            var postData = Garnish.getPostData($blockItem);

            // Because we can have nested fields (ST > Matrix, Matrix > ST), we need to find the Matrix field.
            // If there is more than one parent '.field' class, it means this Matrix field is being nested. We
            // need to chop up the data sent to the controller to just be the Matrix data, not everything.
            var levelsDeep = $blockItem.parents('.field').length;
            var isNested = (levelsDeep > 1) ? true : false;

            if (isNested) {
                var parsedPostData = {};

                for (var paramHandle in postData) {
                    var parsedHandle = paramHandle.replace(/^fields.+?(fields])/mg, 'fields');

                    // Save the namespace for later;
                    data.namespace = paramHandle.match(/^fields.+?(fields])/mg)[0];

                    parsedPostData[parsedHandle] = postData[paramHandle];
                }

                var params = Craft.expandPostArray(parsedPostData);
            } else {
                var params = Craft.expandPostArray(postData);
            }

            var fields = params.fields;

            for (var fieldHandle in fields) {
                data.field = fieldHandle;

                for (var blockId in fields[fieldHandle].blocks) {
                    var block = fields[fieldHandle].blocks[blockId];

                    // Save the block ID for later
                    block.blockId = $blockItem.data('id');

                    data.blocks.push(block);
                }
            }
        }

        // Cleanup nested block data. Massive pain, but seems related to delta updates.
        // Basically helps to prevent heaps of empty data sent to the server.
        data = this.filterBlocks(data);

        return data;
    },

    filterBlocks: function(object) {
        var self = this;

        if (object.blocks) {
            object.blocks = object.blocks.filter(function(el) {
                return el != null;
            });

            // Fix the sort order too, won't work otherwise.
            if (object.sortOrder) {
                var sortOrder = [];

                for (var i = 0; i < object.blocks.length; i++) {
                    sortOrder.push(i)
                }

                object.sortOrder = sortOrder;
            }
        }

        Object.keys(object).forEach(function(index) {
            var item  = object[index];

            if (Array.isArray()) {
                for (var i = 0; i < item.length; i++) {
                    self.filterBlocks(item[i]);
                }
            }

            if (typeof item === 'object') {
                self.filterBlocks(item);
            }
        });
        
        return object;
    }

});


})(jQuery);
