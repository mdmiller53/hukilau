Ext.ns('org.systemsbiology.hukilau.components');

org.systemsbiology.hukilau.components.Workspace = Ext.extend(Ext.TabPanel,{
    constructor: function(config) {
        Ext.apply(this, config, {
            query_counter: 1,
            cytoscape_root_id: 'c_vis'
        });

        this.graph_display = new org.systemsbiology.hukilau.components.GraphDisplay({
            cytoscape_root_id: this.cytoscape_root_id,
            default_visual_style: this.default_visual_style,
            workspace: this
        });

        org.systemsbiology.hukilau.components.Workspace.superclass.constructor.apply(this, arguments);
    },

    initComponent: function() {
        var simple_query = new org.systemsbiology.hukilau.components.queries.BasicQuery({
            workspace: this,
            graph_uri: this.data.uri,
            graph_id: this.data.id,
            data_schema: this.data_schema
        });

        Ext.apply(this, {
            closable: true,
            activeItem: 0,
            items: [
                new Ext.Panel({
                    title: 'Settings',
                    html: '<div class="query_error">Filter settings shown here.</div>'
                }),
                this.graph_display.getPanel(),
                new Ext.Panel({
                    title: 'Queries',
                    layout: 'column',
                    items: [
                        simple_query
                    ]
                })
            ],
            listeners: {
                beforeclose: {
                    scope: this,
                    fn: function() {
                        this.graph_display.destroy();
                    }
                }
            }
        });

        org.systemsbiology.hukilau.components.Workspace.superclass.initComponent.call(this);
    },

    insertResultTab: function(json) {
        var qrd = new org.systemsbiology.hukilau.components.QueryResultDisplay({
            container_title: 'Query ' + this.query_counter,
            json: json
        });
        this.query_counter++;

        qrd.on("addElements", this.graph_display.addElements, this.graph_display);

        var result_panel = qrd.getPanel();
        this.add(result_panel);
        this.setActiveTab(result_panel);
    },

    insertMessageTab: function(message) {
        var panel = new org.systemsbiology.hukilau.components.queries.ErrorDisplay({
            title: 'Query ' + this.query_counter,
            message: message
        });

        this.query_counter++;

        this.add(panel);
        this.setActiveTab(panel);
    }
});
