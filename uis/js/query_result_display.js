Ext.ns('org.systemsbiology.hukilau.components');

org.systemsbiology.hukilau.components.QueryResultDisplay = Ext.extend(Object,{
	node_prop_store: undefined,
	node_grid: undefined,
	edge_prop_store: undefined,
	edge_grid: undefined,
	grid_container: undefined,
	data_schema: undefined,

	parent_container: undefined,
	container_title: undefined,

	constructor: function(config) {
        Ext.apply(this, config, {
            container_title: "Query Result"
        });

        var request_config = config.request;
		
		var success_fn = function(o) {
            var json = Ext.util.JSON.decode(o.responseText);

            if (json.data.numberOfEdges > 0 || json.data.numberOfNodes > 0) {
            	org.systemsbiology.hukilau.apis.events.MessageBus.fireEvent('graph_dataschema_available', json.dataSchema);

                this.create_grids(json);
            }
            else {
            	this.show_error("Query result is empty");
            }			
		};

        var failure_fn = function () {
            this.show_error("Query failed")
        };

		if (request_config.method == 'get') {
	        Ext.Ajax.request({
		        method: 'get',
		        url: request_config.uri,
		        scope: this,
		        success: success_fn,
		        failure: failure_fn
			});
    	}
    	else if (request_config.method == 'post') {
	        Ext.Ajax.request({
		        method: 'post',
		        url: request_config.uri,
		        params: request_config.params,
		        scope: this,
		        success: success_fn,
		        failure: failure_fn
	        });
    	}
	},

	show_error: function(error_msg) {
		var error_panel = new Ext.Panel({
			title: this.container_title,
			html: '<div class="query_error">' + error_msg + '</div>',
			closable: true
        });

		this.parent_container.add(error_panel);
		this.parent_container.activate(error_panel);
	},

	create_grids: function(data) {
		var that = this;

		this.node_prop_store = new Ext.data.JsonStore({
			data: {
				rows: data.data.nodes,
				metaData: {
					fields: data.dataSchema.nodes,
					root: 'rows'
				}
			}
		});

		this.hide_fields(data.dataSchema.nodes, ['name', 'label', 'id', 'uri'], this.find_field_indices(data.dataSchema.nodes));
		var node_columns = this.create_node_columns(data.dataSchema.nodes);
        this.node_grid = new Ext.grid.GridPanel({
		    title: 'Nodes',
		    region: 'center',
		    autoScroll: true,
		    autoWidth: true,
		    loadMask: true,
		    disabled: false,
		    ds: this.node_prop_store,
		    cm: new Ext.grid.ColumnModel(node_columns),
		    tbar: [
		    	{
		    		text: "Add Nodes",
		    		handler: function() {
                        var node_rows = that.node_grid.getSelectionModel().getSelections();
		    			var nodes = {};

		    			Ext.each(node_rows, function(row) {
	    					nodes[row.data.id] = true;
		    			});

                        var filter_fn = function (record) {
                            var source = record.data.source;
		    				var target = record.data.target;

		    				return nodes.hasOwnProperty(source) && nodes.hasOwnProperty(target);
		    			};

		    			var edge_rows = that.edge_grid.getStore().queryBy(filter_fn);

		    			org.systemsbiology.hukilau.apis.events.MessageBus.fireEvent('add_elements_to_graph', {
		    				graph_uri: Ext.getCmp('graph_database_combo').getValue(),
		    				node_rows: node_rows,
		    				edge_rows: edge_rows.items
		    			});	
		    		}
		    	}
		    ]
		});

		this.add_node_label_fields(data.dataSchema.edges);
		this.add_node_labels(data.data.edges, data.data.nodes);
		this.edge_prop_store = new Ext.data.JsonStore({
			data: {
				rows: data.data.edges,
				metaData: {
					fields: data.dataSchema.edges,
					root: 'rows'
				}
			}
		});

		this.hide_fields(data.dataSchema.edges, ['name', 'label', 'id', 'uri', 'source', 'target'], this.find_field_indices(data.dataSchema.edges));
		var edge_columns = this.create_edge_columns(data.dataSchema.edges);
		this.edge_grid = new Ext.grid.GridPanel({
		    title: 'Edges',
		    region: 'south',
		    split: true,
		    height: 300,
            autoScroll: true,
		    autoWidth: true,
		    loadMask: true,
		    disabled: false,
		    ds: this.edge_prop_store,
		    cm: new Ext.grid.ColumnModel(edge_columns),
		    tbar: [
		    	{
		    		text: "Add Edges",
		    		handler: function() {
		    			var nodes = {};

		    			var edge_rows = that.edge_grid.getSelectionModel().getSelections();
		    			Ext.each(edge_rows, function(row) {
		    				nodes[row.data.source] = true;
		    				nodes[row.data.target] = true;
		    			});

		    			// Build a filter function for finding the source and target node rows for each edge
                        var filter_fn = function (record) {
                            return nodes.hasOwnProperty(record.data.id);
		    			};

		    			var node_rows = that.node_grid.getStore().queryBy(filter_fn);

		    			org.systemsbiology.hukilau.apis.events.MessageBus.fireEvent('add_elements_to_graph', {
		    				graph_uri: Ext.getCmp('graph_database_combo').getValue(),
		    				node_rows: node_rows.items,
		    				edge_rows: edge_rows
		    			});
		    		}
		    	}
		    ]
		});

		this.grid_container = new Ext.Panel({
			title: this.container_title,
			layout: 'border',
			closable: true,
			items: [
				this.node_grid,
				this.edge_grid
			]
		});

		this.parent_container.add(this.grid_container);
		this.parent_container.activate(this.grid_container);
    },

    build_column_model: function(meta_data) {
		var columns = [];

        for (var i = 0; i < meta_data.length; i++ ) {
            var field = meta_data[i];

            var col = {
            	xtype: 'gridcolumn',
                header: field.name,
                type: field.type,
                dataIndex: field.name
            };

            if (field.header) {
            	col.header = field.header;
            }
            else {
            	col.header = field.name;
            }

            if (field.hidden) {
            	col.hidden = true;
            	col.sortable = false;
            }
            else {
            	col.sortable = true;
            }

            columns.push(col);
        }
		
		return columns;
	},

	map_field: function(p_array, key) {
		var map = {};
		var n = p_array.length;

		for (var i = 0; i < n; i++) {
			map[p_array[i][key]] = p_array[i];
		}

		return map;
	},

	find_field_indices: function(p_array) {
		var field_map = {};
		var n = p_array.length;

		for (var i = 0; i < n; i++) {
			field_map[p_array[i].name] = i;
		}

		return field_map;
	},

	hide_fields: function(meta, fields, name_to_index_map) {
		var n = fields.length;
		for (var i = 0; i < n; i++) {
			if (name_to_index_map.hasOwnProperty(fields[i])) {
				var index = name_to_index_map[fields[i]];
				meta[index].hidden = true;
			}
		}
	},

	create_node_columns: function(schema) {
		return this.build_column_model(schema);
	},

	create_edge_columns: function(schema) {
		var columns = this.build_column_model(schema);
		        
		columns.push({
			xtype: 'gridcolumn',
			name: "source_label",
			header: "source",
			dataIndex: "source_label"
		});

		columns.push({
			xtype: 'gridcolumn',
			name: "target_label",
			header: "target",
			dataIndex: "target_label"
		});

		return columns;
	},

	add_node_label_fields: function(edge_schema) {
		edge_schema.push({
			name: "source_label",
			header: "source",
			dataIndex: "source_label"
		});

		edge_schema.push({
			name: "target_label",
			header: "target",
			dataIndex: "target_label"
		});			
	},

	add_node_labels: function(edges, nodes) {
		var nodes_by_uri = this.map_field(nodes, 'uri');
		var n = edges.length;
		for (var i = 0; i < n; i++) {
			var edge = edges[i];
			edge.source_label = nodes_by_uri[edge.source].label;
			edge.target_label = nodes_by_uri[edge.target].label;
		}
	}
});
