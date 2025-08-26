# Node Grouping Feature

## Overview

The graph visualization now supports visual grouping of nodes based on a `groupName` field in the node data. Nodes with the same `groupName` will be visually grouped together with a colored background rectangle and group label.

## Usage

### Adding Group Information to Nodes

Add a `groupName` field to your node data:

```json
{
  "nodeId": "validateCard",
  "description": "Validate the credit card information",
  "shortDescription": "Card Validation",
  "groupName": "Payment Processing",
  "type": "action",
  "nextNodes": [...]
}
```

### Group Features

- **Visual Background**: Nodes with the same `groupName` are surrounded by a colored rectangle
- **Group Labels**: Each group shows the group name and node count (e.g., "Payment Processing (3)")
- **Color Coding**: Different groups automatically get different colors from a predefined palette
- **Automatic Layout**: The group boundaries are calculated automatically based on node positions

### Group Colors

The system cycles through 8 predefined color combinations:
- Blue
- Green 
- Yellow
- Red
- Purple
- Pink
- Cyan
- Emerald

## Example Data Structure

See `sample-grouped-data.json` for a complete example with three groups:
- **Payment Processing**: Core payment workflow nodes
- **Notification System**: Communication and logging nodes  
- **Error Handling**: Error management nodes

## Implementation Details

### Components

- **GroupBackground**: React component that renders group backgrounds
- **Types**: Extended `GraphNode` and `FlowNodeData` interfaces with `groupName` field
- **Layout**: Groups are positioned automatically based on node positions with padding

### Visual Design

- Semi-transparent backgrounds (8% opacity)
- Dashed borders (25% opacity)  
- Labels with white background for better readability
- Z-index ordering to render behind nodes
- Responsive to zoom and pan operations

## Integration

The grouping feature is automatically enabled when nodes have `groupName` fields. No additional configuration is required - simply add the `groupName` property to your node data and groups will appear automatically.

### Optional Usage

If nodes don't have `groupName` fields, the graph will render normally without any grouping visuals. The feature is completely backward compatible.