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
        // Initialize Smith on new Matrix entries
        Garnish.on(Craft.MatrixInput, 'entryAdded', $.proxy(this, 'entryAdded'));

        // Initialize again when opening an element slideout
        Garnish.on(Craft.CpScreenSlideout, 'load', this.initSmith.bind(this));

        this.initSmith();
    },

    initSmith: function() {
        Garnish.requestAnimationFrame($.proxy(function() {
            var $matrixFields = Garnish.$doc.find('.matrix-field');

            for (var i = 0; i < $matrixFields.length; i++) {
                var $matrixField = $($matrixFields[i]);
                var $matrixBlocks = $matrixField.find('> .blocks > .matrixblock');

                for (var j = 0; j < $matrixBlocks.length; j++) {
                    var $matrixBlock = $($matrixBlocks[j]);
                    this.addMenu($matrixField, $matrixBlock);
                }
            }
        }, this));
    },

    entryAdded: function(e, attempt) {
        attempt = attempt || 0;

        Garnish.requestAnimationFrame($.proxy(function() {
            var $matrixField = e.target.$container;
            var $matrixBlock = $(e.$entry);

            if (!this.addMenu($matrixField, $matrixBlock) && attempt < 60) {
                this.entryAdded(e, attempt + 1);
            }
        }, this));
    },

    addMenu: function($matrixField, $matrixBlock) {
        if ($matrixBlock.hasClass('static') || $matrixBlock.data('renderedSmith')) {
            return true;
        }

        if (!$matrixBlock.data('entry')) {
            return false;
        }

        new Craft.Smith.Menu($matrixField, $matrixBlock);

        return true;
    },
});

Craft.Smith.Menu = Garnish.Base.extend({
    init: function($matrixField, $matrixBlock) {
        this.$matrixField = $matrixField;
        this.$matrixBlock = $matrixBlock;

        if (this.$matrixBlock.data('renderedSmith')) {
            return;
        }

        this.blockInstance = this.$matrixBlock.data('entry');

        // Keep track of the delete option - we want to insert before that
        var $deleteOption = this.blockInstance.$actionMenu.find('[data-action="delete"]').parents('ul');

        // Create our buttons
        this.$copyBtn = $('<a data-icon="copy" data-action="copy">' + Craft.t('app', 'Copy') + '</a>');
        this.$pasteBtn = $('<a data-icon="paste" data-action="paste">' + Craft.t('app', 'Paste') + '</a>');
        this.$cloneBtn = $('<a data-icon="clone" data-action="clone">' + Craft.t('app', 'Clone') + '</a>');

        // Add new menu items to the DOM
        const $ul = $('<ul/>');
        this.$copyBtn.appendTo($ul).wrap('<li/>');
        this.$pasteBtn.appendTo($ul).wrap('<li/>');
        this.$cloneBtn.appendTo($ul).wrap('<li/>');
        $ul.insertBefore($deleteOption);
        $('<hr class="padded">').insertBefore($deleteOption);

        this.addListener(this.$copyBtn, 'click', this.handleClick);
        this.addListener(this.$pasteBtn, 'click', this.handleClick);
        this.addListener(this.$cloneBtn, 'click', this.handleClick);

        // Perform some checks
        this.checkPaste();

        // Prevent double-binding
        this.$matrixBlock.data('renderedSmith', true);
    },

    handleClick: function(e) {
        var $option = $(e.target);

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

        this.blockInstance.actionDisclosure.hide();
    },


    checkPaste: function() {
        var canPaste = false;

        try {
            var data = JSON.parse(localStorage.getItem('smith:block'));
            var fieldHandle = this.$matrixField.attr('id');

            // Find copy data for this field
            if (data && fieldHandle.includes(data.fieldId)) {
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

            if (!matrixField.canAddMoreEntries(data.blocks.length)) {
                Craft.cp.displayError(Craft.t(
                    'app',
                    'Entry could not be added. Maximum number of entries reached.'
                ));
                $spinner.remove();
                return;
            }

            // Figure out the next block, to instruct Matrix to insert before that one
            var $insertBefore = $spinner;

            var prepareDraft = Promise.resolve();

            if (matrixField.elementEditor) {
                prepareDraft = matrixField.elementEditor.setFormValue(
                    matrixField.settings.baseInputName,
                    '*'
                );
            }

            prepareDraft
                .then(() => {
                    var queue = matrixField.elementEditor && matrixField.elementEditor.queue ?
                        matrixField.elementEditor.queue :
                        Craft.queue;

                    return queue.push(() => {
                        // Add in information about where we're pasting into
                        data.target = {
                            fieldId: matrixField.settings.fieldId,
                            ownerId: matrixField.settings.ownerId,
                            ownerElementType: matrixField.settings.ownerElementType,
                            siteId: matrixField.settings.siteId,
                            namespace: matrixField.settings.namespace,
                        };

                        // Fetch the blocks, rendered with values
                        return Craft.sendActionRequest('POST', 'smith/field/render-matrix-blocks', { data })
                            .then((response) => {
                                var pauseEditor = matrixField.elementEditor ? matrixField.elementEditor.pause() : Promise.resolve();

                                return pauseEditor
                                    .then(() => {
                                        for (var i = 0; i < response.data.blocks.length; i++) {
                                            var blockData = response.data.blocks[i];

                                            const $entry = $(blockData.blockHtml);

                                            $entry.insertBefore($insertBefore);

                                            matrixField.trigger('entryAdded', {
                                                $entry: $entry,
                                            });

                                            Craft.initUiElements($entry.children('.fields'));
                                            Craft.appendHeadHtml(blockData.headHtml);
                                            Craft.appendBodyHtml(blockData.bodyHtml);

                                            new Craft.MatrixInput.Entry(matrixField, $entry);

                                            matrixField.entrySort.addItems($entry);
                                            matrixField.entrySelect.addItems($entry);
                                            matrixField.updateAddEntryBtn();
                                        }
                                    })
                                    .finally(() => {
                                        if (matrixField.elementEditor) {
                                            matrixField.elementEditor.resume();
                                        }
                                    });
                            });
                    });
                })
                .catch((error) => {
                    console.error(error);
                })
                .finally(() => {
                    $spinner.remove();
                });
        } catch(e) { }
    },

    cloneBlock: function(e) {
        var data = this._serializeBlocks();

        this.pasteBlock(e, data);
    },

    _serializeBlocks: function() {
        var matrixField = this.$matrixField.data('matrix');
        var $selectedItems = matrixField.entrySelect.$selectedItems;

        var data = {
            fieldId: matrixField.id,
            blocks: []
        };

        if (!$selectedItems.length) {
            $selectedItems = this.$matrixBlock;
        }

        for (var i = 0; i < $selectedItems.length; i++) {
            var $blockItem = $($selectedItems[i]);

            data.blocks.push({
                id: $blockItem.data('id'),
                uid: $blockItem.data('uid'),
                fieldId: matrixField.settings.fieldId,
                entryTypeId: $blockItem.data('type-id'),
                ownerId: matrixField.settings.ownerId,
                ownerElementType: matrixField.settings.ownerElementType,
                siteId: matrixField.settings.siteId,
                namespace: matrixField.settings.namespace,
            });
        }

        return data;
    },
});


})(jQuery);
