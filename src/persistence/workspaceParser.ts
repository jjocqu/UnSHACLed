/// <reference path="./parser.ts"/>

import {Component} from "./component";
import {Graph, ImmutableGraph} from "./graph";
import * as Collections from "typescript-collections";
import {ModelData} from "../entities/modelData";
import {ModelComponent} from "../entities/modelTaskMetadata";

/**
 * A Parser that takes care of the (de)serialization of the entire workspace,
 * as codified by the Model's ModelData.
 */
export class WorkspaceParser implements Parser<ModelData> {

    private data: ModelData;

    private mimeTypes: Collections.Set<string>;

    /**
     * Create a new WorkspaceParser.
     */
    public constructor() {
        this.clean();

        this.mimeTypes = new Collections.Set<string>();
        this.mimeTypes.add("application/ld+json");
    }

    /**
     * Serialize the workspace to a JSON representation.
     * @param {Component<Graph>} data
     * @param {string} mime
     * @param {((result: string) => void) | null} andThen
     */
    public serialize(data: ModelData, mime: string, andThen: ((result: string) => void) | null): void {
        if (this.mimeTypes.contains(mime)) {
            let builder = new Array<string>();
            let SHACLComponent = data.getOrCreateComponent(
                ModelComponent.SHACLShapesGraph,
                () => new Component<ImmutableGraph>()
            );

            let dataComponent = data.getOrCreateComponent(
                ModelComponent.DataGraph,
                () => new Component<ImmutableGraph>()
            );

            let ioComponent = data.getOrCreateComponent(
                ModelComponent.IO,
                () => new Component<ImmutableGraph>()
            );

            builder.push("{");
            builder.push(this.serializeComponent(ModelComponent.SHACLShapesGraph, SHACLComponent) + ",",
                this.serializeComponent(ModelComponent.DataGraph, dataComponent) + ",",
                this.serializeComponent(ModelComponent.IO, ioComponent));
            builder.push("}");

            if (andThen) {
                andThen(builder.join(""));
            }
        } else {
            throw new Error("Incorrect MimeType " + mime + "!");
        }
    }

    /**
     * Parse a JSON string containing a codified workspace.
     * @param {string} content
     * @param {string} mime
     * @param {((result: Component<Graph>) => void) | null} andThen
     */
    public parse(content: string, mime: string, andThen: ((result: ModelData) => void) | null): void {
        if (this.mimeTypes.contains(mime)) {
            let components = JSON.parse(content);

            let SHACLComponent = this.parseComponent(components.SHACLShapesGraph);
            let dataComponent = this.parseComponent(components.DataGraph);
            let ioComponent = this.parseComponent(components.IO);
            this.data.setComponent(ModelComponent.SHACLShapesGraph, SHACLComponent);
            this.data.setComponent(ModelComponent.DataGraph, dataComponent);
            this.data.setComponent(ModelComponent.IO, ioComponent);

            if (andThen) {
                andThen(this.data);
            }
        } else {
            throw new Error("Incorrect MimeType " + mime + "!");
        }
    }

    /**
     * Return the data contained within this WorkspaceParser.
     * @returns {Component<Graph>}
     */
    public getData(): ModelData {
        return this.data;
    }

    /**
     * Clean whatever is contained within this WorkspaceParser.
     */
    public clean(): void {
        this.data = new ModelData();
    }

    /**
     * Serialize a single component.
     * @param type
     * @param {Component<Graph>} component
     * @returns {string}
     */
    private serializeComponent(type: ModelComponent, component: Component<ImmutableGraph>): string {
        let builder = new Array<string>();
        let self = this;

        builder.push("{ type: " + type.toString() + ", content : [");
        component.getCompositeParts().forEach(p => {
            builder.push("{ id:" + p[0] + ", triples: [");
            p[1].queryN3Store(store => {
                let triples = new Array<string>();
                store.getTriples().forEach(triple => {
                    triples.push(self.tripleToJSON(triple));
                });
                builder.push(triples.join(","));
            });
            builder.push("]}");
        });
        builder.push("]}");

        return builder.join("");
    }

    /**
     * Parse a JSON object containing an encoded component.
     * @returns {Component<Graph>}
     * @param componentObj
     */
    private parseComponent(componentObj: any): Component<ImmutableGraph> {
        let component = new Component<ImmutableGraph>();
        componentObj.content.forEach( p => {
            let graph = new Graph();
            p.triples.forEach(t => {
                console.log(t);
            });
            component = component.withPart(p.id, graph.asImmutable());
        });

        return component;
    }

    /**
     * Convert a triple to JSON-LD format.
     * @param triple
     * @returns {string}
     */
    private tripleToJSON(triple: any): string {
        let N3 = require("n3");

        return JSON.stringify({
            "@id": triple.subject,
            [triple.predicate]: N3.Util.isLiteral(triple.object)
                ? N3.Util.getLiteralValue(triple.object) : triple.object,
        }, null, '  ');
    }
}
